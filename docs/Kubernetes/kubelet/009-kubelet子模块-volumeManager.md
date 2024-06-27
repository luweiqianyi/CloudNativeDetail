# kubelet子模块-volumeManager
## 功能

## 创建
```go
klet.volumeManager = volumemanager.NewVolumeManager(
	kubeCfg.EnableControllerAttachDetach,
	nodeName,
	klet.podManager,
	klet.podWorkers,
	klet.kubeClient,
	klet.volumePluginMgr,
	klet.containerRuntime,
	kubeDeps.Mounter,
	kubeDeps.HostUtil,
	klet.getPodsDir(),
	kubeDeps.Recorder,
	keepTerminatedPodVolumes,
	volumepathhandler.NewBlockVolumePathHandler())
```
## 运行
::: details 启动，即运行`Run`方法
```go
go kl.volumeManager.Run(kl.sourcesReady, wait.NeverStop)
```
:::

::: details `Run`的实现：本质上是启动三个协程运行各自模块的`Run`方法
```go
func (vm *volumeManager) Run(sourcesReady config.SourcesReady, stopCh <-chan struct{}) {
	defer runtime.HandleCrash()

	if vm.kubeClient != nil {
		// start informer for CSIDriver
		go vm.volumePluginMgr.Run(stopCh)
	}

	go vm.desiredStateOfWorldPopulator.Run(sourcesReady, stopCh)
	klog.V(2).InfoS("The desired_state_of_world populator starts")

	klog.InfoS("Starting Kubelet Volume Manager")
	go vm.reconciler.Run(stopCh)

	metrics.Register(vm.actualStateOfWorld, vm.desiredStateOfWorld, vm.volumePluginMgr)

	<-stopCh
	klog.InfoS("Shutting down Kubelet Volume Manager")
}
```
可以看到，`Run`方法内部启动了三个协程，每一个负责不同的功能。
:::

::: details 协程一：`volumePluginMgr`的`Run`方法
```go
// 初始化kubelet对象的volumePluginMgr的值
klet.volumePluginMgr, err =
		NewInitializedVolumePluginMgr(klet, secretManager, configMapManager, tokenManager, kubeDeps.VolumePlugins, kubeDeps.DynamicPluginProber)

// 设置volumeManager的成员变量volumePluginMgr为kubelet对象的volumePluginMgr
vm.volumePluginMgr = klet.volumePluginMgr

// Run方法的具体实现，其中Host的数据类型为kubeletVolumeHost
func (pm *VolumePluginMgr) Run(stopCh <-chan struct{}) {
	// Host的值的指定在NewInitializedVolumePluginMgr函数的实现中
	kletHost, ok := pm.Host.(KubeletVolumeHost)
	if ok {
		// start informer for CSIDriver
		informerFactory := kletHost.GetInformerFactory() // informerFactory的指定也在NewInitializedVolumePluginMgr函数中有了详细代码
		informerFactory.Start(stopCh)
		informerFactory.WaitForCacheSync(stopCh)
	}
}

```
上述代码中的`GetInformerFactory`得到的`InformerFactory`是在`NewInitializedVolumePluginMgr`创建出来的，其中`NewInitializedVolumePluginMgr`的实现如下所示
```go
func NewInitializedVolumePluginMgr(
	kubelet *Kubelet,
	secretManager secret.Manager,
	configMapManager configmap.Manager,
	tokenManager *token.Manager,
	plugins []volume.VolumePlugin,
	prober volume.DynamicPluginProber) (*volume.VolumePluginMgr, error) {

	// Initialize csiDriverLister before calling InitPlugins
	var informerFactory informers.SharedInformerFactory
	var csiDriverLister storagelisters.CSIDriverLister
	var csiDriversSynced cache.InformerSynced
	const resyncPeriod = 0
	// Don't initialize if kubeClient is nil
	if kubelet.kubeClient != nil {
		informerFactory = informers.NewSharedInformerFactory(kubelet.kubeClient, resyncPeriod)
		csiDriverInformer := informerFactory.Storage().V1().CSIDrivers()
		csiDriverLister = csiDriverInformer.Lister()
		// 其中Informer函数会负责将csiDriverInformer加到informerFactory中去(如果informerFactory中没有csiDriverInformer的话)
		csiDriversSynced = csiDriverInformer.Informer().HasSynced

	} else {
		klog.InfoS("KubeClient is nil. Skip initialization of CSIDriverLister")
	}

	kvh := &kubeletVolumeHost{
		kubelet:          kubelet,
		volumePluginMgr:  volume.VolumePluginMgr{},
		secretManager:    secretManager,
		configMapManager: configMapManager,
		tokenManager:     tokenManager,
		informerFactory:  informerFactory,
		csiDriverLister:  csiDriverLister,
		csiDriversSynced: csiDriversSynced,
		exec:             utilexec.New(),
	}

	if err := kvh.volumePluginMgr.InitPlugins(plugins, prober, kvh); err != nil {
		return nil, fmt.Errorf(
			"could not initialize volume plugins for KubeletVolumePluginMgr: %v",
			err)
	}

	return &kvh.volumePluginMgr, nil
}
```
`SharedInformerFactory`的创建逻辑如下
```go
func NewSharedInformerFactory(client kubernetes.Interface, defaultResync time.Duration) SharedInformerFactory {
	return NewSharedInformerFactoryWithOptions(client, defaultResync)
}

// NewSharedInformerFactoryWithOptions逻辑如下
func NewSharedInformerFactoryWithOptions(client kubernetes.Interface, defaultResync time.Duration, options ...SharedInformerOption) SharedInformerFactory {
	factory := &sharedInformerFactory{
		client:           client,
		namespace:        v1.NamespaceAll,
		defaultResync:    defaultResync,
		informers:        make(map[reflect.Type]cache.SharedIndexInformer),
		startedInformers: make(map[reflect.Type]bool),
		customResync:     make(map[reflect.Type]time.Duration),
	}

	// Apply all options
	for _, opt := range options {
		factory = opt(factory)
	}

	return factory
}
```

回到`VolumePluginMgr`中的`Run`方法中，调用了`Start`方法，`Start`的逻辑如下：
```go
func (f *sharedInformerFactory) Start(stopCh <-chan struct{}) {
	f.lock.Lock()
	defer f.lock.Unlock()

	if f.shuttingDown {
		return
	}

	for informerType, informer := range f.informers {
		if !f.startedInformers[informerType] {
			f.wg.Add(1)
			// We need a new variable in each loop iteration,
			// otherwise the goroutine would use the loop variable
			// and that keeps changing.
			informer := informer
			go func() {
				defer f.wg.Done()
				informer.Run(stopCh)
			}()
			f.startedInformers[informerType] = true
		}
	}
}
```
上面的代码可以看出来，就是对`sharedInformerFactory`中的所有`informer`对象，都启动一个协程来运行它的`Run`方法。


`VolumePluginMgr`管理的是与`Storage`相关的`sharedInformerFactory`和`informer`对象。详细的创建代码上面已经给出：`informerFactory.Storage().V1().CSIDrivers()`，这里对其进行详细描述:
```go
func (f *sharedInformerFactory) Storage() storage.Interface {
	return storage.New(f, f.namespace, f.tweakListOptions)
}

// storage.New 的实现如下
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &group{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}

// V1的实现如下
func (g *group) V1() v1.Interface {
	return v1.New(g.factory, g.namespace, g.tweakListOptions)
}

// v1.New的实现如下
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &version{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}

// CSIDrivers returns a CSIDriverInformer.
func (v *version) CSIDrivers() CSIDriverInformer {
	return &cSIDriverInformer{factory: v.factory, tweakListOptions: v.tweakListOptions}
}

// 调用factory.InformerFor的本质就是将自己加到factory中去，这个factory就是上面提到的sharedInformerFactory。
func (f *cSIDriverInformer) Informer() cache.SharedIndexInformer {
	return f.factory.InformerFor(&storagev1.CSIDriver{}, f.defaultInformer)
}

// 检查并创建informer(检查本地是否有obj类型的informer；有就直接返回；没有则调用newFunc回调函数来创建，并将新创建出来的informer添加到本地进行管理)
func (f *sharedInformerFactory) InformerFor(obj runtime.Object, newFunc internalinterfaces.NewInformerFunc) cache.SharedIndexInformer {
	f.lock.Lock()
	defer f.lock.Unlock()

	// 根据obj在自己的informers中是否有这一类型的informer,有就直接返回
	informerType := reflect.TypeOf(obj)
	informer, exists := f.informers[informerType]
	if exists {
		return informer
	}

	// 检查有没有关于这一informer类型的同步周期(time.Duration)，不存在就用默认的
	resyncPeriod, exists := f.customResync[informerType]
	if !exists {
		resyncPeriod = f.defaultResync
	}

	// 创建informer并添加到自己的informers中
	informer = newFunc(f.client, resyncPeriod)
	f.informers[informerType] = informer

	return informer
}

// 这里的newFunc就是cSIDriverInformer的defaultInformer函数
func (f *cSIDriverInformer) defaultInformer(client kubernetes.Interface, resyncPeriod time.Duration) cache.SharedIndexInformer {
	return NewFilteredCSIDriverInformer(client, resyncPeriod, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}, f.tweakListOptions)
}

// 其中NewFilteredCSIDriverInformer的实现如下所示
func NewFilteredCSIDriverInformer(client kubernetes.Interface, resyncPeriod time.Duration, indexers cache.Indexers, tweakListOptions internalinterfaces.TweakListOptionsFunc) cache.SharedIndexInformer {
	return cache.NewSharedIndexInformer(
		&cache.ListWatch{
			ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
				if tweakListOptions != nil {
					tweakListOptions(&options)
				}
				return client.StorageV1().CSIDrivers().List(context.TODO(), options)
			},
			WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
				if tweakListOptions != nil {
					tweakListOptions(&options)
				}
				return client.StorageV1().CSIDrivers().Watch(context.TODO(), options)
			},
		},
		&storagev1.CSIDriver{},
		resyncPeriod,
		indexers,
	)
}

// NewSharedIndexInformer的实现如下，本质上是调用了NewSharedIndexInformerWithOptions创建Informer
func NewSharedIndexInformer(lw ListerWatcher, exampleObject runtime.Object, defaultEventHandlerResyncPeriod time.Duration, indexers Indexers) SharedIndexInformer {
	return NewSharedIndexInformerWithOptions(
		lw,
		exampleObject,
		SharedIndexInformerOptions{
			ResyncPeriod: defaultEventHandlerResyncPeriod,
			Indexers:     indexers,
		},
	)
}

// NewSharedIndexInformerWithOptions实现如下，本质上是创建sharedIndexInformer对象
func NewSharedIndexInformerWithOptions(lw ListerWatcher, exampleObject runtime.Object, options SharedIndexInformerOptions) SharedIndexInformer {
	realClock := &clock.RealClock{}

	return &sharedIndexInformer{
		indexer:                         NewIndexer(DeletionHandlingMetaNamespaceKeyFunc, options.Indexers),
		processor:                       &sharedProcessor{clock: realClock},
		listerWatcher:                   lw,
		objectType:                      exampleObject,
		objectDescription:               options.ObjectDescription,
		resyncCheckPeriod:               options.ResyncPeriod,
		defaultEventHandlerResyncPeriod: options.ResyncPeriod,
		clock:                           realClock,
		cacheMutationDetector:           NewCacheMutationDetector(fmt.Sprintf("%T", exampleObject)),
	}
}

// Informer的Run方法，再回到开头关于sharedInformerFactory的Start方法，本质上就是对sharedInformerFactory中的所有Informer，都运行下面这个方法
func (s *sharedIndexInformer) Run(stopCh <-chan struct{}) {
	defer utilruntime.HandleCrash()

	if s.HasStarted() {
		klog.Warningf("The sharedIndexInformer has started, run more than once is not allowed")
		return
	}

	func() {
		s.startedLock.Lock()
		defer s.startedLock.Unlock()

		fifo := NewDeltaFIFOWithOptions(DeltaFIFOOptions{
			KnownObjects:          s.indexer,
			EmitDeltaTypeReplaced: true,
			Transformer:           s.transform,
		})

		cfg := &Config{
			Queue:             fifo,
			ListerWatcher:     s.listerWatcher,
			ObjectType:        s.objectType,
			ObjectDescription: s.objectDescription,
			FullResyncPeriod:  s.resyncCheckPeriod,
			RetryOnError:      false,
			ShouldResync:      s.processor.shouldResync,

			Process:           s.HandleDeltas,
			WatchErrorHandler: s.watchErrorHandler,
		}

		s.controller = New(cfg)
		s.controller.(*controller).clock = s.clock
		s.started = true
	}()

	// Separate stop channel because Processor should be stopped strictly after controller
	processorStopCh := make(chan struct{})
	var wg wait.Group
	defer wg.Wait()              // Wait for Processor to stop
	defer close(processorStopCh) // Tell Processor to stop
	wg.StartWithChannel(processorStopCh, s.cacheMutationDetector.Run)
	wg.StartWithChannel(processorStopCh, s.processor.run)

	defer func() {
		s.startedLock.Lock()
		defer s.startedLock.Unlock()
		s.stopped = true // Don't want any new listeners
	}()
	s.controller.Run(stopCh)
}

// 上述代码中controller.Run方法的实现如下所示
func (c *controller) Run(stopCh <-chan struct{}) {
	defer utilruntime.HandleCrash()
	go func() {
		<-stopCh
		c.config.Queue.Close()
	}()
	r := NewReflectorWithOptions(
		c.config.ListerWatcher,
		c.config.ObjectType,
		c.config.Queue,
		ReflectorOptions{
			ResyncPeriod:    c.config.FullResyncPeriod,
			TypeDescription: c.config.ObjectDescription,
			Clock:           c.clock,
		},
	)
	r.ShouldResync = c.config.ShouldResync
	r.WatchListPageSize = c.config.WatchListPageSize
	if c.config.WatchErrorHandler != nil {
		r.watchErrorHandler = c.config.WatchErrorHandler
	}

	c.reflectorMutex.Lock()
	c.reflector = r
	c.reflectorMutex.Unlock()

	var wg wait.Group

	wg.StartWithChannel(stopCh, r.Run)

	wait.Until(c.processLoop, time.Second, stopCh)
	wg.Wait()
}
```
:::

::: details 协程二：`desiredStateOfWorldPopulator`的`Run`方法
```go

```
:::

::: details 协程三：`reconciler`的`Run`方法
```go

```
:::


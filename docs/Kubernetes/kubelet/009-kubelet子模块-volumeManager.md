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
// 创建
vm.desiredStateOfWorldPopulator = populator.NewDesiredStateOfWorldPopulator(
		kubeClient,
		desiredStateOfWorldPopulatorLoopSleepPeriod,
		podManager,
		podStateProvider,
		vm.desiredStateOfWorld,
		vm.actualStateOfWorld,
		kubeContainerRuntime,
		keepTerminatedPodVolumes,
		csiMigratedPluginManager,
		intreeToCSITranslator,
		volumePluginMgr)

func NewDesiredStateOfWorldPopulator(
	kubeClient clientset.Interface,
	loopSleepDuration time.Duration,
	podManager PodManager,
	podStateProvider PodStateProvider,
	desiredStateOfWorld cache.DesiredStateOfWorld,
	actualStateOfWorld cache.ActualStateOfWorld,
	kubeContainerRuntime kubecontainer.Runtime,
	keepTerminatedPodVolumes bool,
	csiMigratedPluginManager csimigration.PluginManager,
	intreeToCSITranslator csimigration.InTreeToCSITranslator,
	volumePluginMgr *volume.VolumePluginMgr) DesiredStateOfWorldPopulator {
	return &desiredStateOfWorldPopulator{
		kubeClient:          kubeClient,
		loopSleepDuration:   loopSleepDuration,
		podManager:          podManager,
		podStateProvider:    podStateProvider,
		desiredStateOfWorld: desiredStateOfWorld,
		actualStateOfWorld:  actualStateOfWorld,
		pods: processedPods{
			processedPods: make(map[volumetypes.UniquePodName]bool)},
		kubeContainerRuntime:     kubeContainerRuntime,
		keepTerminatedPodVolumes: keepTerminatedPodVolumes,
		hasAddedPods:             false,
		hasAddedPodsLock:         sync.RWMutex{},
		csiMigratedPluginManager: csiMigratedPluginManager,
		intreeToCSITranslator:    intreeToCSITranslator,
		volumePluginMgr:          volumePluginMgr,
	}
}
```
```go
// 运行
func (dswp *desiredStateOfWorldPopulator) Run(sourcesReady config.SourcesReady, stopCh <-chan struct{}) {
	// Wait for the completion of a loop that started after sources are all ready, then set hasAddedPods accordingly
	klog.InfoS("Desired state populator starts to run")
	wait.PollUntil(dswp.loopSleepDuration, func() (bool, error) {
		done := sourcesReady.AllReady()
		dswp.populatorLoop()
		return done, nil
	}, stopCh)
	dswp.hasAddedPodsLock.Lock()
	if !dswp.hasAddedPods {
		klog.InfoS("Finished populating initial desired state of world")
		dswp.hasAddedPods = true
	}
	dswp.hasAddedPodsLock.Unlock()
	wait.Until(dswp.populatorLoop, dswp.loopSleepDuration, stopCh)
}

// populatorLoop的具体实现
func (dswp *desiredStateOfWorldPopulator) populatorLoop() {
	dswp.findAndAddNewPods()
	dswp.findAndRemoveDeletedPods()
}

// findAndAddNewPods的具体实现（获取节点上的卷，然后获取Pods，对Pods中每一个Pod调用processPodVolumes进行处理）
func (dswp *desiredStateOfWorldPopulator) findAndAddNewPods() {
	// Map unique pod name to outer volume name to MountedVolume.
	mountedVolumesForPod := make(map[volumetypes.UniquePodName]map[string]cache.MountedVolume)
	for _, mountedVolume := range dswp.actualStateOfWorld.GetMountedVolumes() {
		mountedVolumes, exist := mountedVolumesForPod[mountedVolume.PodName]
		if !exist {
			mountedVolumes = make(map[string]cache.MountedVolume)
			mountedVolumesForPod[mountedVolume.PodName] = mountedVolumes
		}
		mountedVolumes[mountedVolume.OuterVolumeSpecName] = mountedVolume
	}

	for _, pod := range dswp.podManager.GetPods() {
		// Keep consistency of adding pod during reconstruction
		if dswp.hasAddedPods && dswp.podStateProvider.ShouldPodContainersBeTerminating(pod.UID) {
			// Do not (re)add volumes for pods that can't also be starting containers
			continue
		}

		if !dswp.hasAddedPods && dswp.podStateProvider.ShouldPodRuntimeBeRemoved(pod.UID) {
			// When kubelet restarts, we need to add pods to dsw if there is a possibility
			// that the container may still be running
			continue
		}

		dswp.processPodVolumes(pod, mountedVolumesForPod)
	}
}

// processPodVolumes的具体实现
func (dswp *desiredStateOfWorldPopulator) processPodVolumes(
	pod *v1.Pod,
	mountedVolumesForPod map[volumetypes.UniquePodName]map[string]cache.MountedVolume) {
	if pod == nil {
		return
	}

	uniquePodName := util.GetUniquePodName(pod)
	if dswp.podPreviouslyProcessed(uniquePodName) {
		return
	}

	allVolumesAdded := true
	// 获取pod使用的卷和devices
	mounts, devices, seLinuxContainerContexts := util.GetPodVolumeNames(pod)

	// Process volume spec for each volume defined in pod
	for _, podVolume := range pod.Spec.Volumes {
		if !mounts.Has(podVolume.Name) && !devices.Has(podVolume.Name) {
			// Volume is not used in the pod, ignore it.
			klog.V(4).InfoS("Skipping unused volume", "pod", klog.KObj(pod), "volumeName", podVolume.Name)
			continue
		}

		pvc, volumeSpec, volumeGidValue, err :=
			dswp.createVolumeSpec(podVolume, pod, mounts, devices)
		if err != nil {
			klog.ErrorS(err, "Error processing volume", "pod", klog.KObj(pod), "volumeName", podVolume.Name)
			dswp.desiredStateOfWorld.AddErrorToPod(uniquePodName, err.Error())
			allVolumesAdded = false
			continue
		}

		// Add volume to desired state of world
		uniqueVolumeName, err := dswp.desiredStateOfWorld.AddPodToVolume(
			uniquePodName, pod, volumeSpec, podVolume.Name, volumeGidValue, seLinuxContainerContexts[podVolume.Name])
		if err != nil {
			klog.ErrorS(err, "Failed to add volume to desiredStateOfWorld", "pod", klog.KObj(pod), "volumeName", podVolume.Name, "volumeSpecName", volumeSpec.Name())
			dswp.desiredStateOfWorld.AddErrorToPod(uniquePodName, err.Error())
			allVolumesAdded = false
		} else {
			klog.V(4).InfoS("Added volume to desired state", "pod", klog.KObj(pod), "volumeName", podVolume.Name, "volumeSpecName", volumeSpec.Name())
		}
		if !utilfeature.DefaultFeatureGate.Enabled(features.NewVolumeManagerReconstruction) {
			// sync reconstructed volume. This is necessary only when the old-style reconstruction is still used.
			// With reconstruct_new.go, AWS.MarkVolumeAsMounted will update the outer spec name of previously
			// uncertain volumes.
			dswp.actualStateOfWorld.SyncReconstructedVolume(uniqueVolumeName, uniquePodName, podVolume.Name)
		}

		dswp.checkVolumeFSResize(pod, podVolume, pvc, volumeSpec, uniquePodName, mountedVolumesForPod)
	}

	// some of the volume additions may have failed, should not mark this pod as fully processed
	if allVolumesAdded {
		dswp.markPodProcessed(uniquePodName)
		// New pod has been synced. Re-mount all volumes that need it
		// (e.g. DownwardAPI)
		dswp.actualStateOfWorld.MarkRemountRequired(uniquePodName)
		// Remove any stored errors for the pod, everything went well in this processPodVolumes
		dswp.desiredStateOfWorld.PopPodErrors(uniquePodName)
	} else if dswp.podHasBeenSeenOnce(uniquePodName) {
		// For the Pod which has been processed at least once, even though some volumes
		// may not have been reprocessed successfully this round, we still mark it as processed to avoid
		// processing it at a very high frequency. The pod will be reprocessed when volume manager calls
		// ReprocessPod() which is triggered by SyncPod.
		dswp.markPodProcessed(uniquePodName)
	}

}

// findAndRemoveDeletedPods的具体实现
func (dswp *desiredStateOfWorldPopulator) findAndRemoveDeletedPods() {
	podsFromCache := make(map[volumetypes.UniquePodName]struct{})
	for _, volumeToMount := range dswp.desiredStateOfWorld.GetVolumesToMount() {
		podsFromCache[volumetypes.UniquePodName(volumeToMount.Pod.UID)] = struct{}{}
		pod, podExists := dswp.podManager.GetPodByUID(volumeToMount.Pod.UID)
		if podExists {

			// check if the attachability has changed for this volume
			if volumeToMount.PluginIsAttachable {
				attachableVolumePlugin, err := dswp.volumePluginMgr.FindAttachablePluginBySpec(volumeToMount.VolumeSpec)
				// only this means the plugin is truly non-attachable
				if err == nil && attachableVolumePlugin == nil {
					// It is not possible right now for a CSI plugin to be both attachable and non-deviceMountable
					// So the uniqueVolumeName should remain the same after the attachability change
					dswp.desiredStateOfWorld.MarkVolumeAttachability(volumeToMount.VolumeName, false)
					klog.InfoS("Volume changes from attachable to non-attachable", "volumeName", volumeToMount.VolumeName)
					continue
				}
			}

			// Exclude known pods that we expect to be running
			if !dswp.podStateProvider.ShouldPodRuntimeBeRemoved(pod.UID) {
				continue
			}
			if dswp.keepTerminatedPodVolumes {
				continue
			}
		}

		// Once a pod has been deleted from kubelet pod manager, do not delete
		// it immediately from volume manager. Instead, check the kubelet
		// pod state provider to verify that all containers in the pod have been
		// terminated.
		if !dswp.podStateProvider.ShouldPodRuntimeBeRemoved(volumeToMount.Pod.UID) {
			klog.V(4).InfoS("Pod still has one or more containers in the non-exited state and will not be removed from desired state", "pod", klog.KObj(volumeToMount.Pod))
			continue
		}
		var volumeToMountSpecName string
		if volumeToMount.VolumeSpec != nil {
			volumeToMountSpecName = volumeToMount.VolumeSpec.Name()
		}
		removed := dswp.actualStateOfWorld.PodRemovedFromVolume(volumeToMount.PodName, volumeToMount.VolumeName)
		if removed && podExists {
			klog.V(4).InfoS("Actual state does not yet have volume mount information and pod still exists in pod manager, skip removing volume from desired state", "pod", klog.KObj(volumeToMount.Pod), "podUID", volumeToMount.Pod.UID, "volumeName", volumeToMountSpecName)
			continue
		}
		klog.V(4).InfoS("Removing volume from desired state", "pod", klog.KObj(volumeToMount.Pod), "podUID", volumeToMount.Pod.UID, "volumeName", volumeToMountSpecName)
		dswp.desiredStateOfWorld.DeletePodFromVolume(
			volumeToMount.PodName, volumeToMount.VolumeName)
		dswp.deleteProcessedPod(volumeToMount.PodName)
	}

	// Cleanup orphanded entries from processedPods
	dswp.pods.Lock()
	orphanedPods := make([]volumetypes.UniquePodName, 0, len(dswp.pods.processedPods))
	for k := range dswp.pods.processedPods {
		if _, ok := podsFromCache[k]; !ok {
			orphanedPods = append(orphanedPods, k)
		}
	}
	dswp.pods.Unlock()
	for _, orphanedPod := range orphanedPods {
		uid := types.UID(orphanedPod)
		_, podExists := dswp.podManager.GetPodByUID(uid)
		if !podExists && dswp.podStateProvider.ShouldPodRuntimeBeRemoved(uid) {
			dswp.deleteProcessedPod(orphanedPod)
		}
	}

	podsWithError := dswp.desiredStateOfWorld.GetPodsWithErrors()
	for _, podName := range podsWithError {
		if _, podExists := dswp.podManager.GetPodByUID(types.UID(podName)); !podExists {
			dswp.desiredStateOfWorld.PopPodErrors(podName)
		}
	}
}
```
:::

::: details 协程三：`reconciler`的`Run`方法
创建`reconciler`
```go
vm.reconciler = reconciler.NewReconciler(
	kubeClient,
	controllerAttachDetachEnabled,
	reconcilerLoopSleepPeriod,
	waitForAttachTimeout,
	nodeName,
	vm.desiredStateOfWorld,
	vm.actualStateOfWorld,
	vm.desiredStateOfWorldPopulator.HasAddedPods,
	vm.operationExecutor,
	mounter,
	hostutil,
	volumePluginMgr,
	kubeletPodsDir)

// NewReconciler函数的实现体
func NewReconciler(
	kubeClient clientset.Interface,
	controllerAttachDetachEnabled bool,
	loopSleepDuration time.Duration,
	waitForAttachTimeout time.Duration,
	nodeName types.NodeName,
	desiredStateOfWorld cache.DesiredStateOfWorld,
	actualStateOfWorld cache.ActualStateOfWorld,
	populatorHasAddedPods func() bool,
	operationExecutor operationexecutor.OperationExecutor,
	mounter mount.Interface,
	hostutil hostutil.HostUtils,
	volumePluginMgr *volumepkg.VolumePluginMgr,
	kubeletPodsDir string) Reconciler {
	return &reconciler{
		kubeClient:                      kubeClient,
		controllerAttachDetachEnabled:   controllerAttachDetachEnabled,
		loopSleepDuration:               loopSleepDuration,
		waitForAttachTimeout:            waitForAttachTimeout,
		nodeName:                        nodeName,
		desiredStateOfWorld:             desiredStateOfWorld,
		actualStateOfWorld:              actualStateOfWorld,
		populatorHasAddedPods:           populatorHasAddedPods,
		operationExecutor:               operationExecutor,
		mounter:                         mounter,
		hostutil:                        hostutil,
		skippedDuringReconstruction:     map[v1.UniqueVolumeName]*globalVolumeInfo{},
		volumePluginMgr:                 volumePluginMgr,
		kubeletPodsDir:                  kubeletPodsDir,
		timeOfLastSync:                  time.Time{},
		volumesFailedReconstruction:     make([]podVolume, 0),
		volumesNeedUpdateFromNodeStatus: make([]v1.UniqueVolumeName, 0),
		volumesNeedReportedInUse:        make([]v1.UniqueVolumeName, 0),
	}
}
```
`reconciler`的`Run`方法：可以看到`NewVolumeManagerReconstruction`属性被激活时就使用新的运行方法(`runNew`)；未被激活时则使用旧的运行方法(`runOld`)
```go
func (rc *reconciler) Run(stopCh <-chan struct{}) {
	if utilfeature.DefaultFeatureGate.Enabled(features.NewVolumeManagerReconstruction) {
		rc.runNew(stopCh)
		return
	}

	rc.runOld(stopCh)
}
```

`runOld`的具体实现
```go
func (rc *reconciler) runOld(stopCh <-chan struct{}) {
	wait.Until(rc.reconciliationLoopFunc(), rc.loopSleepDuration, stopCh)
}

// 结合上面的代码，可以看到runOld的本质就是周期性执行reconciliationLoopFunc函数，直到stopCh收到关闭信号
func (rc *reconciler) reconciliationLoopFunc() func() {
	return func() {
		rc.reconcile()

		// Sync the state with the reality once after all existing pods are added to the desired state from all sources.
		// Otherwise, the reconstruct process may clean up pods' volumes that are still in use because
		// desired state of world does not contain a complete list of pods.
		if rc.populatorHasAddedPods() && !rc.StatesHasBeenSynced() {
			klog.InfoS("Reconciler: start to sync state")
			rc.sync()
		}
	}
}

// reconcile函数的实现如下
func (rc *reconciler) reconcile() {
	// Unmounts are triggered before mounts so that a volume that was
	// referenced by a pod that was deleted and is now referenced by another
	// pod is unmounted from the first pod before being mounted to the new
	// pod.
	rc.unmountVolumes()

	// Next we mount required volumes. This function could also trigger
	// attach if kubelet is responsible for attaching volumes.
	// If underlying PVC was resized while in-use then this function also handles volume
	// resizing.
	rc.mountOrAttachVolumes()

	// Ensure devices that should be detached/unmounted are detached/unmounted.
	rc.unmountDetachDevices()

	// After running the above operations if skippedDuringReconstruction is not empty
	// then ensure that all volumes which were discovered and skipped during reconstruction
	// are added to actualStateOfWorld in uncertain state.
	if len(rc.skippedDuringReconstruction) > 0 {
		rc.processReconstructedVolumes()
	}
}
// 可以看到，reconcile函数本质上就是执行了四个行为，每个行为的具体内容这里就不再展开，具体代码逻辑可以详看“pkg\kubelet\volumemanager\reconciler\reconciler_common.go”中的实现。
// unmountVolumes函数是卸载卷，当卷需要挂载到另外一个pod时，需要从原pod中卸载，即unmount
// mountOrAttachVolumes函数是挂载卷。将卷挂载到新的pod上。
// unmountDetachDevices函数确保那些应该被detached/unmounted的卷真的被detached/unmounted了。
// processReconstructedVolumes函数的执行是有先决条件的，符合条件时，它才能执行。它的功能是：确保在重建过程中发现并跳过的所有卷都以不确定状态添加到 actualStateOfWorld 中。
```
:::


# kubelet子模块-resourceAnalyzer
## 功能
获取所有`pod`的`VolumeStats`，更新自己的本地缓存。详情：通过`statsProvider`可以获取的所有`Pod`，获取它们的`volumes`的`VolumeStats`，更新自己的`cachedVolumeStats`。
## 创建
::: details 创建`resourceAnalyzer`对象
```go
klet.resourceAnalyzer = serverstats.NewResourceAnalyzer(klet, kubeCfg.VolumeStatsAggPeriod.Duration, kubeDeps.Recorder)
```
:::

::: details `NewResourceAnalyzer`的具体实现
```go
func NewResourceAnalyzer(statsProvider Provider, calVolumeFrequency time.Duration, eventRecorder record.EventRecorder) ResourceAnalyzer {
	fsAnalyzer := newFsResourceAnalyzer(statsProvider, calVolumeFrequency, eventRecorder)
	summaryProvider := NewSummaryProvider(statsProvider)
	return &resourceAnalyzer{fsAnalyzer, summaryProvider}
}
```
:::
## 运行
::: details 启动`resourceAnalyzer`
```go
kl.resourceAnalyzer.Start()
```
:::

::: details `resourceAnalyzer`的`Start`函数的具体实现。可以看到内部是启动一个协程，协程的工作按周期永久调用`updateCachedPodVolumeStats`函数。
```go
func (ra *resourceAnalyzer) Start() {
	ra.fsResourceAnalyzer.Start()
}

func (s *fsResourceAnalyzer) Start() {
	s.startOnce.Do(func() {
		if s.calcPeriod <= 0 {
			klog.InfoS("Volume stats collection disabled")
			return
		}
		klog.InfoS("Starting FS ResourceAnalyzer")
		go wait.Forever(func() { s.updateCachedPodVolumeStats() }, s.calcPeriod)
	})
}
```
:::

::: details `updateCachedPodVolumeStats`的具体实现: 先从`cachedVolumeStats`中读取数据到旧缓存中，并由`statsProvider`去获取`pods`，根据`podID`在本地缓存中查找`VolumeStats`是否存在，不存在就新建并加到本地缓存中；存在就更新本地缓存关于该`podID`的`VolumeStats`。同时比较新缓存和旧缓存中元素的差异，对于那些在新缓存中没有而在旧缓存中有的数据，让其自行调用`StopOnce`来结束自己。最终把更新后的新缓存重新存到`cachedVolumeStats`结构中。
```go
func (s *fsResourceAnalyzer) updateCachedPodVolumeStats() {
	oldCache := s.cachedVolumeStats.Load().(statCache)
	newCache := make(statCache)

	// Copy existing entries to new map, creating/starting new entries for pods missing from the cache
	for _, pod := range s.statsProvider.GetPods() {
		if value, found := oldCache[pod.GetUID()]; !found {
			newCache[pod.GetUID()] = newVolumeStatCalculator(s.statsProvider, s.calcPeriod, pod, s.eventRecorder).StartOnce()
		} else {
			newCache[pod.GetUID()] = value
		}
	}

	// Stop entries for pods that have been deleted
	for uid, entry := range oldCache {
		if _, found := newCache[uid]; !found {
			entry.StopOnce()
		}
	}

	// Update the cache reference
	s.cachedVolumeStats.Store(newCache)
}
```
:::

::: details `StartOnce`的具体实现：本质上是采用指数退避算法调用`calcAndStoreStats`函数，通过`stopChannel`通道来结束协程的运行。
```go
func (s *volumeStatCalculator) StartOnce() *volumeStatCalculator {
	s.startO.Do(func() {
		go wait.JitterUntil(func() {
			s.calcAndStoreStats()
		}, s.jitterPeriod, 1.0, true, s.stopChannel)
	})
	return s
}
```
:::

::: details `calcAndStoreStats`的大体功能为：对`pod`的能够进行`metric`统计的所有`volume`，封装成`stats.VolumeStats`，存储到`latest`缓存中。具体逻辑如下：
```go
func (s *volumeStatCalculator) calcAndStoreStats() {
	// Find all Volumes for the Pod
	volumes, found := s.statsProvider.ListVolumesForPod(s.pod.UID)
	blockVolumes, bvFound := s.statsProvider.ListBlockVolumesForPod(s.pod.UID)
	if !found && !bvFound {
		return
	}

	metricVolumes := make(map[string]volume.MetricsProvider)

	if found {
		for name, v := range volumes {
			metricVolumes[name] = v
		}
	}
	if bvFound {
		for name, v := range blockVolumes {
			// Only add the blockVolume if it implements the MetricsProvider interface
			if _, ok := v.(volume.MetricsProvider); ok {
				// Some drivers inherit the MetricsProvider interface from Filesystem
				// mode volumes, but do not implement it for Block mode. Checking
				// SupportsMetrics() will prevent panics in that case.
				if v.SupportsMetrics() {
					metricVolumes[name] = v
				}
			}
		}
	}

	// Get volume specs for the pod - key'd by volume name
	volumesSpec := make(map[string]v1.Volume)
	for _, v := range s.pod.Spec.Volumes {
		volumesSpec[v.Name] = v
	}

	// Call GetMetrics on each Volume and copy the result to a new VolumeStats.FsStats
	var ephemeralStats []stats.VolumeStats
	var persistentStats []stats.VolumeStats
	for name, v := range metricVolumes {
		metric, err := func() (*volume.Metrics, error) {
			trace := utiltrace.New(fmt.Sprintf("Calculate volume metrics of %v for pod %v/%v", name, s.pod.Namespace, s.pod.Name))
			defer trace.LogIfLong(1 * time.Second)
			return v.GetMetrics()
		}()
		if err != nil {
			// Expected for Volumes that don't support Metrics
			if !volume.IsNotSupported(err) {
				klog.V(4).InfoS("Failed to calculate volume metrics", "pod", klog.KObj(s.pod), "podUID", s.pod.UID, "volumeName", name, "err", err)
			}
			continue
		}
		// Lookup the volume spec and add a 'PVCReference' for volumes that reference a PVC
		volSpec := volumesSpec[name]
		var pvcRef *stats.PVCReference
		if pvcSource := volSpec.PersistentVolumeClaim; pvcSource != nil {
			pvcRef = &stats.PVCReference{
				Name:      pvcSource.ClaimName,
				Namespace: s.pod.GetNamespace(),
			}
		} else if volSpec.Ephemeral != nil {
			pvcRef = &stats.PVCReference{
				Name:      ephemeral.VolumeClaimName(s.pod, &volSpec),
				Namespace: s.pod.GetNamespace(),
			}
		}
		volumeStats := s.parsePodVolumeStats(name, pvcRef, metric, volSpec)
		if util.IsLocalEphemeralVolume(volSpec) {
			ephemeralStats = append(ephemeralStats, volumeStats)
		} else {
			persistentStats = append(persistentStats, volumeStats)
		}

		if utilfeature.DefaultFeatureGate.Enabled(features.CSIVolumeHealth) {
			if metric.Abnormal != nil && metric.Message != nil && (*metric.Abnormal) {
				s.eventRecorder.Event(s.pod, v1.EventTypeWarning, "VolumeConditionAbnormal", fmt.Sprintf("Volume %s: %s", name, *metric.Message))
			}
		}
	}

	// Store the new stats
	s.latest.Store(PodVolumeStats{EphemeralVolumes: ephemeralStats,
		PersistentVolumes: persistentStats})
}
```
以上代码的功能解析
1. 获取`Pod`相关的所有卷：
	* 使用`s.statsProvider.ListVolumesForPod(s.pod.UID)`获取与`Pod`关联的所有卷。
	* 使用`s.statsProvider.ListBlockVolumesForPod(s.pod.UID)`获取与`Pod`关联的块卷（`Block Volumes`）。
2. 检查卷是否找到：
	* 如果没有找到普通卷和块卷，函数直接返回，不进行进一步操作。
3. 构建`metricVolumes`映射：
	* 创建一个`map[string]volume.MetricsProvider`类型的映射 `metricVolumes`，用于存储支持度量接口`volume.MetricsProvider`的卷对象。
4. 处理普通卷：
	* 将找到的普通卷放入`metricVolumes`映射中。
5. 处理块卷：
	* 对于找到的块卷，检查其是否实现了`MetricsProvider`接口。
	* 如果实现了接口且支持度量（通过`SupportsMetrics()`方法），则将其加入`metricVolumes`映射中。
6. 获取`Pod`的卷规格：
	* 构建一个`volumesSpec`映射，以卷名作为键，存储`Pod`规格中的卷定义`v1.Volume`。
7. 计算卷的度量指标：
	* 对`metricVolumes`中的每个卷调用`GetMetrics()`方法获取其度量指标。
	* 如果卷不支持度量，会捕获到`volume.IsNotSupported`错误并记录日志，然后继续处理下一个卷。
8. 处理度量指标：
	* 查找卷的规格，为引用持久卷声明（`PVC`）的卷添加`PVCReference`。
	* 根据卷的类型（持久或临时）调用相应的方法生成`PVCReference`。
	* 使用`s.parsePodVolumeStats()`方法解析卷的度量指标、规格和`PVCReference`，并生成`VolumeStats`对象。
9. 分类存储统计信息：
	* 将解析后的统计信息根据卷的类型（临时或持久）分别存储到`ephemeralStats`和`persistentStats`切片中。
10. 处理异常情况：
	* 如果启用了特定特性（`features.CSIVolumeHealth`），则检查卷的度量指标中是否有异常情况。
	* 如果发现异常，通过`s.eventRecorder.Event()`记录相应的事件，通知异常情况。
11. 存储最新的统计信息：
	* 使用`s.latest.Store()`方法将最新计算得到的`PodVolumeStats`结构体存储起来，其中包括临时和持久卷的统计信息。

给出一份`pod`描述文件示例便于理解上面的代码，`pod`的`Spec`、`volumes`的描述如下所示：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-webserver
spec:
  os: { name: linux }
  nodeSelector:
    kubernetes.io/os: linux
  containers:
	- name: test-webserver
		image: registry.k8s.io/test-webserver:latest
		volumeMounts:
		- mountPath: /var/local/aaa
		name: mydir
		- mountPath: /var/local/aaa/1.txt
		name: myfile
	- name: myfrontend
		image: nginx
		volumeMounts:
		- mountPath: "/var/www/html"
			name: mypd
  volumes:
	- name: mydir
		hostPath:
		# Ensure the file directory is created.
		path: /var/local/aaa
		type: DirectoryOrCreate
	- name: myfile
		hostPath:
		path: /var/local/aaa/1.txt
		type: FileOrCreate
	- name: mypd
		persistentVolumeClaim:
		claimName: myclaim
```
:::

::: details `VolumeStats`的数据结构。其中上文提到的可度量指标`metric`指的就是`FsStats`中成员变量。
```go
// VolumeStats contains data about Volume filesystem usage.
type VolumeStats struct {
	// Embedded FsStats
	FsStats `json:",inline"`
	// Name is the name given to the Volume
	// +optional
	Name string `json:"name,omitempty"`
	// Reference to the PVC, if one exists
	// +optional
	PVCRef *PVCReference `json:"pvcRef,omitempty"`

	// VolumeHealthStats contains data about volume health
	// +optional
	VolumeHealthStats *VolumeHealthStats `json:"volumeHealthStats,omitempty"`
}

// VolumeHealthStats contains data about volume health.
type VolumeHealthStats struct {
	// Normal volumes are available for use and operating optimally.
	// An abnormal volume does not meet these criteria.
	Abnormal bool `json:"abnormal"`
}

// PVCReference contains enough information to describe the referenced PVC.
type PVCReference struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// FsStats contains data about filesystem usage.
type FsStats struct {
	// The time at which these stats were updated.
	Time metav1.Time `json:"time"`
	// AvailableBytes represents the storage space available (bytes) for the filesystem.
	// +optional
	AvailableBytes *uint64 `json:"availableBytes,omitempty"`
	// CapacityBytes represents the total capacity (bytes) of the filesystems underlying storage.
	// +optional
	CapacityBytes *uint64 `json:"capacityBytes,omitempty"`
	// UsedBytes represents the bytes used for a specific task on the filesystem.
	// This may differ from the total bytes used on the filesystem and may not equal CapacityBytes - AvailableBytes.
	// e.g. For ContainerStats.Rootfs this is the bytes used by the container rootfs on the filesystem.
	// +optional
	UsedBytes *uint64 `json:"usedBytes,omitempty"`
	// InodesFree represents the free inodes in the filesystem.
	// +optional
	InodesFree *uint64 `json:"inodesFree,omitempty"`
	// Inodes represents the total inodes in the filesystem.
	// +optional
	Inodes *uint64 `json:"inodes,omitempty"`
	// InodesUsed represents the inodes used by the filesystem
	// This may not equal Inodes - InodesFree because this filesystem may share inodes with other "filesystems"
	// e.g. For ContainerStats.Rootfs, this is the inodes used only by that container, and does not count inodes used by other containers.
	InodesUsed *uint64 `json:"inodesUsed,omitempty"`
}
```
:::

## statusProvider相关
### resourceAnalyzer用到的statusProvider的初始化
```go
// common provider to get host file system usage associated with a pod managed by kubelet
hostStatsProvider := stats.NewHostStatsProvider(kubecontainer.RealOS{}, func(podUID types.UID) string {
		return getEtcHostsPath(klet.getPodDir(podUID))
	})
if kubeDeps.useLegacyCadvisorStats {
	klet.StatsProvider = stats.NewCadvisorStatsProvider(
		klet.cadvisor,
		klet.resourceAnalyzer,
		klet.podManager,
		klet.runtimeCache,
		klet.containerRuntime,
		klet.statusManager,
		hostStatsProvider)
} else {
	klet.StatsProvider = stats.NewCRIStatsProvider(
		klet.cadvisor,
		klet.resourceAnalyzer,
		klet.podManager,
		klet.runtimeCache,
		kubeDeps.RemoteRuntimeService,
		kubeDeps.RemoteImageService,
		hostStatsProvider,
		utilfeature.DefaultFeatureGate.Enabled(features.PodAndContainerStatsFromCRI))
}
```
### Provider提供可查询的接口如下
```go
type Provider interface {
	// The following stats are provided by either CRI or cAdvisor.
	//
	// ListPodStats returns the stats of all the containers managed by pods.
	ListPodStats(ctx context.Context) ([]statsapi.PodStats, error)
	// ListPodStatsAndUpdateCPUNanoCoreUsage updates the cpu nano core usage for
	// the containers and returns the stats for all the pod-managed containers.
	ListPodCPUAndMemoryStats(ctx context.Context) ([]statsapi.PodStats, error)
	// ListPodStatsAndUpdateCPUNanoCoreUsage returns the stats of all the
	// containers managed by pods and force update the cpu usageNanoCores.
	// This is a workaround for CRI runtimes that do not integrate with
	// cadvisor. See https://github.com/kubernetes/kubernetes/issues/72788
	// for more details.
	ListPodStatsAndUpdateCPUNanoCoreUsage(ctx context.Context) ([]statsapi.PodStats, error)
	// ImageFsStats returns the stats of the image filesystem.
	ImageFsStats(ctx context.Context) (*statsapi.FsStats, error)

	// The following stats are provided by cAdvisor.
	//
	// GetCgroupStats returns the stats and the networking usage of the cgroup
	// with the specified cgroupName.
	GetCgroupStats(cgroupName string, updateStats bool) (*statsapi.ContainerStats, *statsapi.NetworkStats, error)
	// GetCgroupCPUAndMemoryStats returns the CPU and memory stats of the cgroup with the specified cgroupName.
	GetCgroupCPUAndMemoryStats(cgroupName string, updateStats bool) (*statsapi.ContainerStats, error)

	// RootFsStats returns the stats of the node root filesystem.
	RootFsStats() (*statsapi.FsStats, error)

	// The following stats are provided by cAdvisor for legacy usage.
	//
	// GetContainerInfo returns the information of the container with the
	// containerName managed by the pod with the uid.
	GetContainerInfo(ctx context.Context, podFullName string, uid types.UID, containerName string, req *cadvisorapi.ContainerInfoRequest) (*cadvisorapi.ContainerInfo, error)
	// GetRawContainerInfo returns the information of the container with the
	// containerName. If subcontainers is true, this function will return the
	// information of all the sub-containers as well.
	GetRawContainerInfo(containerName string, req *cadvisorapi.ContainerInfoRequest, subcontainers bool) (map[string]*cadvisorapi.ContainerInfo, error)
	// GetRequestedContainersInfo returns the information of the container with
	// the containerName, and with the specified cAdvisor options.
	GetRequestedContainersInfo(containerName string, options cadvisorv2.RequestOptions) (map[string]*cadvisorapi.ContainerInfo, error)

	// The following information is provided by Kubelet.
	//
	// GetPodByName returns the spec of the pod with the name in the specified
	// namespace.
	GetPodByName(namespace, name string) (*v1.Pod, bool)
	// GetNode returns the spec of the local node.
	GetNode() (*v1.Node, error)
	// GetNodeConfig returns the configuration of the local node.
	GetNodeConfig() cm.NodeConfig
	// ListVolumesForPod returns the stats of the volume used by the pod with
	// the podUID.
	ListVolumesForPod(podUID types.UID) (map[string]volume.Volume, bool)
	// ListBlockVolumesForPod returns the stats of the volume used by the
	// pod with the podUID.
	ListBlockVolumesForPod(podUID types.UID) (map[string]volume.BlockVolume, bool)
	// GetPods returns the specs of all the pods running on this node.
	GetPods() []*v1.Pod

	// RlimitStats returns the rlimit stats of system.
	RlimitStats() (*statsapi.RlimitStats, error)

	// GetPodCgroupRoot returns the literal cgroupfs value for the cgroup containing all pods
	GetPodCgroupRoot() string

	// GetPodByCgroupfs provides the pod that maps to the specified cgroup literal, as well
	// as whether the pod was found.
	GetPodByCgroupfs(cgroupfs string) (*v1.Pod, bool)
}
```
> 本文中`resourceAnalyzer`统计`VolumeStatus`时只用到了`ListVolumesForPod`和`GetPods`两个接口。
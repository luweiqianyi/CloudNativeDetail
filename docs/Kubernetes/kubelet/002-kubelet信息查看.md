# kubelet信息查看
## Linux系统查看kubelet服务运行情况
::: details kubelet服务运行情况
```sh
● kubelet.service - kubelet: The Kubernetes Node Agent
     Loaded: loaded (/usr/lib/systemd/system/kubelet.service; enabled; preset: disabled)
    Drop-In: /usr/lib/systemd/system/kubelet.service.d
             └─10-kubeadm.conf
     Active: active (running) since Fri 2024-04-19 17:10:27 CST; 2 months 6 days ago
       Docs: https://kubernetes.io/docs/
   Main PID: 994 (kubelet)
      Tasks: 25 (limit: 100454)
     Memory: 121.6M
        CPU: 1d 12h 50min 201ms
     CGroup: /system.slice/kubelet.service
             └─994 /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime-endpoint=unix:///var/run/containerd/containerd.sock --hostname-override=k8s-master --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.9

Jun 22 10:48:02 localhost.localdomain kubelet[994]: I0618 10:48:02.609669     994 scope.go:117] "RemoveContainer" containerID="13b6e603e30c2da9f018ed05b13130540f45651dcb3311bcf94b825ad39cb538"
Jun 22 14:25:39 localhost.localdomain kubelet[994]: E0618 14:25:39.560357     994 cadvisor_stats_provider.go:444] "Partial failure issuing cadvisor.ContainerInfoV2" err="partial failures: [\"/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podde1d2e45d6b9a2308036bffaaadd3eac.slice/cri-containerd-7ed41e7f5dcd598a9dd88c8c89e2210418f8d08e93a69555be5ee880664c284c.scope\": RecentStats: unable to find data in memory cache]"
Jun 22 14:25:40 localhost.localdomain kubelet[994]: I0618 14:25:40.494746     994 scope.go:117] "RemoveContainer" containerID="2510f5c6e6423c7cddc47b0b32943a40b2e49c294306d4d5e8df7d7f460b1a83"
Jun 22 14:25:40 localhost.localdomain kubelet[994]: I0618 14:25:40.495249     994 scope.go:117] "RemoveContainer" containerID="fb53ee96e1ee3d8b3347436e86d8ad8430bea2e15300e2a7ed47d08e26ab9134"
Jun 22 14:25:40 localhost.localdomain kubelet[994]: I0618 14:25:40.499156     994 scope.go:117] "RemoveContainer" containerID="7ed41e7f5dcd598a9dd88c8c89e2210418f8d08e93a69555be5ee880664c284c"
Jun 22 14:25:41 localhost.localdomain kubelet[994]: I0618 14:25:41.544440     994 scope.go:117] "RemoveContainer" containerID="b8b0fe035c237a992558195d2897133d7735c989d1f6051143fc8b3d3ee3aee6"
Jun 22 14:25:45 localhost.localdomain kubelet[994]: E0618 14:25:45.250161     994 kubelet.go:2477] "Housekeeping took longer than expected" err="housekeeping took too long" expected="1s" actual="2.164s"
Jun 22 14:48:48 localhost.localdomain kubelet[994]: E0618 14:48:48.857447     994 kubelet.go:2477] "Housekeeping took longer than expected" err="housekeeping took too long" expected="1s" actual="7.728s"
Jun 22 19:44:43 localhost.localdomain kubelet[994]: I0618 19:44:43.334945     994 trace.go:236] Trace[1853600187]: "iptables ChainExists" (18-Jun-2024 19:44:38.542) (total time: 4791ms):
Jun 22 19:44:43 localhost.localdomain kubelet[994]: Trace[1853600187]: [4.791178915s] [4.791178915s] END
```
:::
## kubelet启动配置
* `--config`: `kubelet`的启动配置
	::: details kubelet启动配置
	```sh [log]
	apiVersion: kubelet.config.k8s.io/v1beta1
	authentication:
	anonymous:
		enabled: false
	webhook:
		cacheTTL: 0s
		enabled: true
	x509:
		clientCAFile: /etc/kubernetes/pki/ca.crt
	authorization:
	mode: Webhook
	webhook:
		cacheAuthorizedTTL: 0s
		cacheUnauthorizedTTL: 0s
	cgroupDriver: systemd
	clusterDNS:
	- 10.96.0.10
	clusterDomain: cluster.local
	containerRuntimeEndpoint: ""
	cpuManagerReconcilePeriod: 0s
	evictionPressureTransitionPeriod: 0s
	fileCheckFrequency: 0s
	healthzBindAddress: 127.0.0.1
	healthzPort: 10248
	httpCheckFrequency: 0s
	imageMinimumGCAge: 0s
	kind: KubeletConfiguration
	logging:
	flushFrequency: 0
	options:
		json:
		infoBufferSize: "0"
	verbosity: 0
	memorySwap: {}
	nodeStatusReportFrequency: 0s
	nodeStatusUpdateFrequency: 0s
	rotateCertificates: true
	runtimeRequestTimeout: 0s
	shutdownGracePeriod: 0s
	shutdownGracePeriodCriticalPods: 0s
	staticPodPath: /etc/kubernetes/manifests
	streamingConnectionIdleTimeout: 0s
	syncFrequency: 0s
	volumeStatsAggPeriod: 0s
	```
	:::
* `--kubeconfig`: `kubelet`与`API Server`交互时的配置
	::: details kubelet与API Server交互时的配置
	```sh
	apiVersion: v1
	clusters:
	- cluster:
		certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJWUdhYWlnU1QyU2t3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBek1UUXdPVE14TWpsYUZ3MHpOREF6TVRJd09UTTJNamxhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUUNrMWV1YkJ1YUw3ZHNJVm1uWk51THBWNUVhcWlNeDAwVkZQK2NuRkhSUmtuMVBBSUVmVXZLRGUzM00Kc1FoMmROM2VHSFFTSk5QQlRyWStRSjR2TzdDN0VpUmFET05QeC9DWHh0YmxtbTl3U0szYm9ZUnFjSnBzenk2VAp6dmJTSThPcWFJZHBxWk4yd2EzUzZWd0l6Y0Y4Tm9zZ1FGS1pMWGJ0VFU0b0xWdndoemRpOEtFVUk3YjdOOENiClJScHB6SEExZWU1ckxNdjBPRlBRc3ZjbkxKWUVFUzZQUkRjV0RXUTdiaUM0RVNKTHllZnUxMEY2Z0ZBTnFiYkUKUnNYUEhGZ2NMRlVpdnBRZjNNTW5OS2JXL2JMbTlGWlF1ZkRVYmRIbVZmSlA0clJtQkJkOWIwOGVhLzBiYS9xaAptUGROM1pNZUhpQTJRaHl3b0cxb3J5QUo3Wm9CQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTUkowQXNSdndGdjNrL0w0Y3ppMjlUWFlad1VUQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ1BudVk4aEhYVAp0M1UwazZVdVEvOXlIOVRPNTd0TVRmaDNNTjROWHRXMjJ3d1BOU2l4ODV3cytlZlY3VjZIZ2JDOEdrNVljL2JUCjFIRko3VU43N0hDK0xZaW9ZcXJ4clhRSDJGU3M2MHAyZUZwcEFlUmVnMHJKd3pqMytHQmhtS1kyU2ZVaEVwMksKVkR0eTJyaG4zVUt5K1V4dzdlcGZvZTZjeFhDeW1jc0wyVGdOQXlGY0tPMUxNUnJJbGlkOG9EaGtkZzlWbkFqWApyNUVFcHNiZTIxZVlEQVZqQWkzMWF3WW9GVWp5Q1pLTDBBSFNPay9nRitxK0FnRk1EUEFhVG41UU9rQjl4L1RnCmR1Y0ZZQkQxSWlSV21BanFYdFp2cWdSK0NDMUw2UE90bmZsRENhTUUvUm5SaHhXOGozeUp3STUyRG9GQnBnWDkKS050a0N3T1VLRGxNCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
		server: https://192.168.10.61:6443
	name: kubernetes
	contexts:
	- context:
		cluster: kubernetes
		user: system:node:k8s-master
	name: system:node:k8s-master@kubernetes
	current-context: system:node:k8s-master@kubernetes
	kind: Config
	preferences: {}
	users:
	- name: system:node:k8s-master
	user:
		client-certificate: /var/lib/kubelet/pki/kubelet-client-current.pem
		client-key: /var/lib/kubelet/pki/kubelet-client-current.pem
	```
	:::

## pods相关的cgroup信息查看
* `cgroup root`: `/sys/fs/cgroup/kubepods.slice`
	::: details 查找kubepods
	```sh
	[root@localhost ~]# find / -name "kubepods.slice"
	/run/systemd/transient/kubepods.slice
	/sys/fs/cgroup/kubepods.slice
	```
	:::
* 查看`cgroup root`的信息
	::: details cgroup root
	```sh
	[root@localhost ~]# ls /sys/fs/cgroup/kubepods.slice
	cgroup.controllers      cpu.weight.nice                  io.latency                 memory.stat
	cgroup.events           cpuset.cpus                      io.max                     memory.swap.current
	cgroup.freeze           cpuset.cpus.effective            io.stat                    memory.swap.events
	cgroup.kill             cpuset.cpus.exclusive            kubepods-besteffort.slice  memory.swap.high
	cgroup.max.depth        cpuset.cpus.exclusive.effective  kubepods-burstable.slice   memory.swap.max
	cgroup.max.descendants  cpuset.cpus.partition            memory.current             memory.zswap.current
	cgroup.procs            cpuset.mems                      memory.events              memory.zswap.max
	cgroup.stat             cpuset.mems.effective            memory.events.local        misc.current
	cgroup.subtree_control  hugetlb.2MB.current              memory.high                misc.events
	cgroup.threads          hugetlb.2MB.events               memory.low                 misc.max
	cgroup.type             hugetlb.2MB.events.local         memory.max                 pids.current
	cpu.idle                hugetlb.2MB.max                  memory.min                 pids.events
	cpu.max                 hugetlb.2MB.numa_stat            memory.numa_stat           pids.max
	cpu.max.burst           hugetlb.2MB.rsvd.current         memory.oom.group           pids.peak
	cpu.stat                hugetlb.2MB.rsvd.max             memory.peak                rdma.current
	cpu.weight              io.bfq.weight                    memory.reclaim             rdma.max
	```
	:::
* 以`besteffort`属性为例，查看`pods`的该属性信息
	::: details pods cgroup
	```sh
	[root@localhost ~]# ls /sys/fs/cgroup/kubepods.slice/kubepods-besteffort.slice/
	cgroup.controllers               cpuset.cpus.partition                                              memory.min
	cgroup.events                    cpuset.mems                                                        memory.numa_stat
	cgroup.freeze                    cpuset.mems.effective                                              memory.oom.group
	cgroup.kill                      hugetlb.2MB.current                                                memory.peak
	cgroup.max.depth                 hugetlb.2MB.events                                                 memory.reclaim
	cgroup.max.descendants           hugetlb.2MB.events.local                                           memory.stat
	cgroup.procs                     hugetlb.2MB.max                                                    memory.swap.current
	cgroup.stat                      hugetlb.2MB.numa_stat                                              memory.swap.events
	cgroup.subtree_control           hugetlb.2MB.rsvd.current                                           memory.swap.high
	cgroup.threads                   hugetlb.2MB.rsvd.max                                               memory.swap.max
	cgroup.type                      io.bfq.weight                                                      memory.zswap.current
	cpu.idle                         io.latency                                                         memory.zswap.max
	cpu.max                          io.max                                                             misc.current
	cpu.max.burst                    io.stat                                                            misc.events
	cpu.stat                         kubepods-besteffort-podeced071d_9d6e_4d1e_b049_c012849522ac.slice  misc.max
	cpu.weight                       memory.current                                                     pids.current
	cpu.weight.nice                  memory.events                                                      pids.events
	cpuset.cpus                      memory.events.local                                                pids.max
	cpuset.cpus.effective            memory.high                                                        pids.peak
	cpuset.cpus.exclusive            memory.low                                                         rdma.current
	cpuset.cpus.exclusive.effective  memory.max                                                         rdma.max
	```
	:::
* 基于上面的查询结果，可以看到`podeced071d_9d6e_4d1e_b049_c012849522ac`的相关`cgroup`，可继续查看详情
	::: details 某个pod的cgroup
	```sh
	[root@localhost ~]# ls /sys/fs/cgroup/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-podeced071d_9d6e_4d1e_b049_c012849522ac.slice/
	cgroup.controllers                                                                     hugetlb.2MB.rsvd.max
	cgroup.events                                                                          io.bfq.weight
	cgroup.freeze                                                                          io.latency
	cgroup.kill                                                                            io.max
	cgroup.max.depth                                                                       io.stat
	cgroup.max.descendants                                                                 memory.current
	cgroup.procs                                                                           memory.events
	cgroup.stat                                                                            memory.events.local
	cgroup.subtree_control                                                                 memory.high
	cgroup.threads                                                                         memory.low
	cgroup.type                                                                            memory.max
	cpu.idle                                                                               memory.min
	cpu.max                                                                                memory.numa_stat
	cpu.max.burst                                                                          memory.oom.group
	cpu.stat                                                                               memory.peak
	cpu.weight                                                                             memory.reclaim
	cpu.weight.nice                                                                        memory.stat
	cpuset.cpus                                                                            memory.swap.current
	cpuset.cpus.effective                                                                  memory.swap.events
	cpuset.cpus.exclusive                                                                  memory.swap.high
	cpuset.cpus.exclusive.effective                                                        memory.swap.max
	cpuset.cpus.partition                                                                  memory.zswap.current
	cpuset.mems                                                                            memory.zswap.max
	cpuset.mems.effective                                                                  misc.current
	cri-containerd-b526801683b66be741d19490c93176cdaa70a4724be1a84aa100843dc9ff8fdf.scope  misc.events
	cri-containerd-c03987fa37a9cc69824f79c15483fe04957801e2254ef93ab7986ee26994e8ae.scope  misc.max
	hugetlb.2MB.current                                                                    pids.current
	hugetlb.2MB.events                                                                     pids.events
	hugetlb.2MB.events.local                                                               pids.max
	hugetlb.2MB.max                                                                        pids.peak
	hugetlb.2MB.numa_stat                                                                  rdma.current
	hugetlb.2MB.rsvd.current                                                               rdma.max
	```
	:::
* 基于上面的查询结果，可以看到该`pod`内部有两个容器：`cri-containerd-b526801683b66be741d19490c93176cdaa70a4724be1a84aa100843dc9ff8fdf.scope`和`cri-containerd-c03987fa37a9cc69824f79c15483fe04957801e2254ef93ab7986ee26994e8ae.scope`，以其中一个为例查看`cgroup`信息
	::: details pod中某个容器的cgroup
	```sh
	[root@localhost ~]# ls /sys/fs/cgroup/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-podeced071d_9d6e_4d1e_b049_c012849522ac.slice/cri-containerd-b526801683b66be741d19490c93176cdaa70a4724be1a84aa100843dc9ff8fdf.scope
	cgroup.controllers      cgroup.subtree_control  cpu.weight.nice                  hugetlb.2MB.current       io.latency           memory.max           memory.swap.events    pids.current
	cgroup.events           cgroup.threads          cpuset.cpus                      hugetlb.2MB.events        io.max               memory.min           memory.swap.high      pids.events
	cgroup.freeze           cgroup.type             cpuset.cpus.effective            hugetlb.2MB.events.local  io.stat              memory.numa_stat     memory.swap.max       pids.max
	cgroup.kill             cpu.idle                cpuset.cpus.exclusive            hugetlb.2MB.max           memory.current       memory.oom.group     memory.zswap.current  pids.peak
	cgroup.max.depth        cpu.max                 cpuset.cpus.exclusive.effective  hugetlb.2MB.numa_stat     memory.events        memory.peak          memory.zswap.max      rdma.current
	cgroup.max.descendants  cpu.max.burst           cpuset.cpus.partition            hugetlb.2MB.rsvd.current  memory.events.local  memory.reclaim       misc.current          rdma.max
	cgroup.procs            cpu.stat                cpuset.mems                      hugetlb.2MB.rsvd.max      memory.high          memory.stat          misc.events
	cgroup.stat             cpu.weight              cpuset.mems.effective            io.bfq.weight             memory.low           memory.swap.current  misc.max
	```
	:::
* 查看某个具体的cgroup属性
	::: details 查看容器的某个具体cgroup属性值
	```sh
	[root@localhost ~]# cat /sys/fs/cgroup/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-podeced071d_9d6e_4d1e_b049_c012849522ac.slice/cri-containerd-b526801683b66be741d19490c93176cdaa70a4724be1a84aa100843dc9ff8fdf.scope/cpu.stat
	usage_usec 2214389715
	user_usec 1057553615
	system_usec 1156836099
	core_sched.force_idle_usec 0
	nr_periods 0
	nr_throttled 0
	throttled_usec 0
	nr_bursts 0
	burst_usec 0
	```
	:::
## Restful API访问
* `http`访问`/configz`路径获取`kubelet`的配置信息（`json`数据）。其中`kubeletconfig`是`KubeletConfiguration`配置信息。
	```sh
	curl -k --cert /etc/kubernetes/pki/apiserver-kubelet-client.crt --key /etc/kubernetes/pki/apiserver-kubelet-client.key https://127.0.0.1:10250/configz
	```
	::: details /configz响应
	```sh
	{
		"kubeletconfig": {
			"enableServer": true,
			"staticPodPath": "/etc/kubernetes/manifests",
			"syncFrequency": "1m0s",
			"fileCheckFrequency": "20s",
			"httpCheckFrequency": "20s",
			"address": "0.0.0.0",
			"port": 10250,
			"tlsCertFile": "/var/lib/kubelet/pki/kubelet.crt",
			"tlsPrivateKeyFile": "/var/lib/kubelet/pki/kubelet.key",
			"rotateCertificates": true,
			"authentication": {
				"x509": {
					"clientCAFile": "/etc/kubernetes/pki/ca.crt"
				},
				"webhook": {
					"enabled": true,
					"cacheTTL": "2m0s"
				},
				"anonymous": {
					"enabled": false
				}
			},
			"authorization": {
				"mode": "Webhook",
				"webhook": {
					"cacheAuthorizedTTL": "5m0s",
					"cacheUnauthorizedTTL": "30s"
				}
			},
			"registryPullQPS": 5,
			"registryBurst": 10,
			"eventRecordQPS": 50,
			"eventBurst": 100,
			"enableDebuggingHandlers": true,
			"healthzPort": 10248,
			"healthzBindAddress": "127.0.0.1",
			"oomScoreAdj": -999,
			"clusterDomain": "cluster.local",
			"clusterDNS": [
				"10.96.0.10"
			],
			"streamingConnectionIdleTimeout": "4h0m0s",
			"nodeStatusUpdateFrequency": "10s",
			"nodeStatusReportFrequency": "5m0s",
			"nodeLeaseDurationSeconds": 40,
			"imageMinimumGCAge": "2m0s",
			"imageGCHighThresholdPercent": 85,
			"imageGCLowThresholdPercent": 80,
			"volumeStatsAggPeriod": "1m0s",
			"cgroupsPerQOS": true,
			"cgroupDriver": "systemd",
			"cpuManagerPolicy": "none",
			"cpuManagerReconcilePeriod": "10s",
			"memoryManagerPolicy": "None",
			"topologyManagerPolicy": "none",
			"topologyManagerScope": "container",
			"runtimeRequestTimeout": "2m0s",
			"hairpinMode": "promiscuous-bridge",
			"maxPods": 110,
			"podPidsLimit": -1,
			"resolvConf": "/etc/resolv.conf",
			"cpuCFSQuota": true,
			"cpuCFSQuotaPeriod": "100ms",
			"nodeStatusMaxImages": 50,
			"maxOpenFiles": 1000000,
			"contentType": "application/vnd.kubernetes.protobuf",
			"kubeAPIQPS": 50,
			"kubeAPIBurst": 100,
			"serializeImagePulls": true,
			"evictionHard": {
				"imagefs.available": "15%",
				"memory.available": "100Mi",
				"nodefs.available": "10%",
				"nodefs.inodesFree": "5%"
			},
			"evictionPressureTransitionPeriod": "5m0s",
			"enableControllerAttachDetach": true,
			"makeIPTablesUtilChains": true,
			"iptablesMasqueradeBit": 14,
			"iptablesDropBit": 15,
			"failSwapOn": true,
			"memorySwap": {},
			"containerLogMaxSize": "10Mi",
			"containerLogMaxFiles": 5,
			"configMapAndSecretChangeDetectionStrategy": "Watch",
			"enforceNodeAllocatable": [
				"pods"
			],
			"volumePluginDir": "/usr/libexec/kubernetes/kubelet-plugins/volume/exec/",
			"logging": {
				"format": "text",
				"flushFrequency": "5s",
				"verbosity": 0,
				"options": {
					"json": {
						"infoBufferSize": "0"
					}
				}
			},
			"enableSystemLogHandler": true,
			"enableSystemLogQuery": false,
			"shutdownGracePeriod": "0s",
			"shutdownGracePeriodCriticalPods": "0s",
			"enableProfilingHandler": true,
			"enableDebugFlagsHandler": true,
			"seccompDefault": false,
			"memoryThrottlingFactor": 0.9,
			"registerNode": true,
			"localStorageCapacityIsolation": true,
			"containerRuntimeEndpoint": "unix:///var/run/containerd/containerd.sock"
		}
	}
	```
	:::
    
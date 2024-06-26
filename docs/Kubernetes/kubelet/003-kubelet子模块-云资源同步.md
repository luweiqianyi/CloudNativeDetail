# kubelet子模块-云资源同步
## 功能
周期性同步云节点地址，同步周期由`Kubelet`的`nodeStatusUpdateFrequency`参数指定。即下文中的`m.syncPeriod=kl.nodeStatusUpdateFrequency`。

## 数据成员
::: details `Kubelet`中的`cloudResourceSyncManager`
```go
type Kubelet struct{
    cloudResourceSyncManager cloudresource.SyncManager
}
```
:::

## 创建过程
::: details `cloudResourceSyncManager`的初始化过程
```go
// klet是Kubelet对象
if klet.cloud != nil {
	klet.cloudResourceSyncManager = cloudresource.NewSyncManager(klet.cloud, nodeName, klet.nodeStatusUpdateFrequency)
}
```
:::

## 运行详情
::: details `cloudResourceSyncManager Run`方法
```go
// kl是Kubelet对象
go kl.cloudResourceSyncManager.Run(wait.NeverStop)

func (m *cloudResourceSyncManager) Run(stopCh <-chan struct{}) {
	wait.Until(m.syncNodeAddresses, m.syncPeriod, stopCh)
}
```
:::

::: details `Run`方法内部最主要的函数：`syncNodeAddresses`的具体实现
```go
// 其中nodeAddressesMonitor为*sync.Cond类型
func (m *cloudResourceSyncManager) syncNodeAddresses() {
	klog.V(5).InfoS("Requesting node addresses from cloud provider for node", "nodeName", m.nodeName)

	addrs, err := m.getNodeAddresses()

	m.nodeAddressesMonitor.L.Lock()
	defer m.nodeAddressesMonitor.L.Unlock()
	defer m.nodeAddressesMonitor.Broadcast()

	if err != nil {
		klog.V(2).InfoS("Node addresses from cloud provider for node not collected", "nodeName", m.nodeName, "err", err)

		if len(m.nodeAddresses) > 0 {
			// in the event that a sync loop fails when a previous sync had
			// succeeded, continue to use the old addresses.
			return
		}

		m.nodeAddressesErr = fmt.Errorf("failed to get node address from cloud provider: %v", err)
		return
	}

	klog.V(5).InfoS("Node addresses from cloud provider for node collected", "nodeName", m.nodeName)
	m.nodeAddressesErr = nil
	m.nodeAddresses = addrs
}
```
:::

::: details `getNodeAddresses`的具体实现
```go
// 其中cloud为cloudprovider.Interface类型
func (m *cloudResourceSyncManager) getNodeAddresses() ([]v1.NodeAddress, error) {
	instances, ok := m.cloud.Instances()
	if !ok {
		return nil, fmt.Errorf("failed to get instances from cloud provider")
	}
	return instances.NodeAddresses(context.TODO(), m.nodeName)
}
```
::: 

::: details `NodeAddress`数据类型
```go
type NodeAddress struct {
	// Node address type, one of Hostname, ExternalIP or InternalIP.
	Type NodeAddressType `json:"type" protobuf:"bytes,1,opt,name=type,casttype=NodeAddressType"`
	// The node address.
	Address string `json:"address" protobuf:"bytes,2,opt,name=address"`
}
```
:::
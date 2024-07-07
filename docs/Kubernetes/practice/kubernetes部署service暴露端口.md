# kubernetes部署service暴露端口
## 背景
在文章[kubernetes部署Pod](/Kubernetes/practice/kubernetes部署Pod)中，我们已经在我们的集群中部署了一个叫做`httpd-pod`的`Pod`，但是该`Pod`只能在集群内部访问，不能被集群外的节点访问，在某些场景下，我们需要一种机制，让这个`Pod`能够被集群外的节点访问。这就可以使用`kubernetes`中的`Service`来实现。

## 使用Service之前访问Pod节点
当前执行`shell`命令的节点是`kubernetes`集群中的某一台主机，比如`IP`地址为`192.168.10.61`这台主机。以下命令均在该主机上执行。
```sh
[root@localhost kubernetes-practice]# curl 192.168.10.60:80
<html>
<head><title>308 Permanent Redirect</title></head>
<body>
<center><h1>308 Permanent Redirect</h1></center>
<hr><center>nginx/1.25.2</center>
</body>
</html>
```
> 这里，我们之前的`http-pod`节点被部署在`ip`地址为`192.168.10.60`的主机上，我们尝试使用`192.168.10.60:80`地址去访问这个`pod`可以看到，访问失败。

在文章[kubernetes部署Pod](/Kubernetes/practice/kubernetes部署Pod)中，我们可以看到`http-pod`在集群内部的地址为`10.244.1.167`，所以下面用这个地址来尝试访问`Pod`，执行结果如下所示
```sh
[root@localhost kubernetes-practice]# curl 10.244.1.167:80
<html><body><h1>It works!</h1></body></html>
```
> 可以看到，我们用集群内地址访问`Pod`是可以的。

## 使用Service暴露端口访问Pod
### 定义Service描述文件
文件名为：`httpd-service-nodeport.yaml`，文件内容如下所示：
```yaml
apiVersion: v1
kind: Service
metadata:
  name: httpd-service
  namespace: nicklaus
spec:
  type: NodePort
  selector:
    app: httpd-pod
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```
> 以上描述文件将主机的`30080`映射到`pod`的`80`端口。采用的`Service`类型为`NodePort`。

### 部署
```sh
[root@localhost kubernetes-practice]# kubectl apply -f httpd-service-nodeport.yaml
service/httpd-service created
```
### 访问测试
```sh
[root@localhost kubernetes-practice]# curl 192.168.10.60:30080
<html><body><h1>It works!</h1></body></html>
```
> 可以看到：使用主机`Host`地址来访问也可以访问到我们的`Pod`。另外使用`curl 192.168.10.61:30080`也可以访问到，可以自己尝试一下。因为两个主机同属一个集群。

查看集群中的主机(节点/`Node`)
```sh
[root@localhost kubernetes-practice]# kubectl get nodes -o wide
NAME           STATUS   ROLES           AGE    VERSION    INTERNAL-IP     EXTERNAL-IP   OS-IMAGE                      KERNEL-VERSION                 CONTAINER-RUNTIME
k8s-master     Ready    control-plane   112d   v1.28.8    192.168.10.61   <none>        Rocky Linux 9.4 (Blue Onyx)   5.14.0-362.24.1.el9_3.x86_64   containerd://1.6.33
k8s-worker-1   Ready    <none>          112d   v1.28.10   192.168.10.60   <none>        Rocky Linux 9.4 (Blue Onyx)   5.14.0-427.16.1.el9_4.x86_64   containerd://1.6.31
```

### 关于ports的说明
`ports`: 定义服务监听的端口及其转发规则。
* `port`: 指定服务暴露的端口号为`80`。这是用户访问服务的端口号。
* `targetPort`: 指定服务转发到的后端`Pod`的端口号为`80`。当服务接收到流量时，将其转发到被选择`Pod`的这个端口。
* `nodePort`: 指定节点上用于服务的公开端口号为`30080`。这是`Kubernetes`集群节点上外部访问服务的端口号，任何集群外部的请求到达该端口将会被转发到服务的`targetPort`上对应的`Pod`。
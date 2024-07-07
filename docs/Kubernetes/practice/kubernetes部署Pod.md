# kubernetes部署Pod
## 准备资源描述文件
假设文件名就叫做`http-pod.yaml`，文件内容如下：
```yaml
# namespace定义
apiVersion: v1
kind: Namespace
metadata:
  name: nicklaus

---

# Pod定义
apiVersion: v1
kind: Pod
metadata:
  name: httpd-pod
  namespace: nicklaus
  labels:
    app: httpd-pod
spec:
  containers:
  - name: container-httpd
    image: harbor.nicklaus.com/library/httpd:latest
    ports:
    - containerPort: 80
```
> `image: harbor.nicklaus.com/library/httpd:latest`指定镜像源地址为自建仓库的地址。

如何自建镜像仓库详见文章[harbor-本地镜像仓库搭建](/Docker/practice/harbor-本地镜像仓库搭建)和[containerd配置使用自建的镜像仓库](/containerd/containerd配置使用自建的镜像仓库)。

## 部署Pod
```sh
[root@localhost kubernetes-practice]# kubectl apply -f http-pod.yaml
namespace/nicklaus created
pod/httpd-pod created
```
可以看到，`pod`成功部署！

## 查看Pod
```sh
[root@localhost kubernetes-practice]# kubectl get pods -n nicklaus
NAME        READY   STATUS    RESTARTS   AGE
httpd-pod   1/1     Running   0          9s
[root@localhost kubernetes-practice]# kubectl describe pods -n nicklaus
Name:             httpd-pod
Namespace:        nicklaus
Priority:         0
Service Account:  default
Node:             k8s-worker-1/192.168.30.72
Start Time:       Fri, 05 Jul 2024 15:37:09 +0800
Labels:           app=httpd-pod
Annotations:      <none>
Status:           Running
IP:               10.244.1.167
IPs:
  IP:  10.244.1.167
Containers:
  container-httpd:
    Container ID:   containerd://42815e81445f9cd231a704181519b6f4087d5aa4f2621e05292f4a6f8a3816ac
    Image:          harbor.nicklaus.com/library/httpd:latest
    Image ID:       harbor.nicklaus.com/library/httpd@sha256:07776427935a87ffaaca2875af6b19441e08ca4c7a18dafaf9ac9a7ff38dfe9e
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Fri, 05 Jul 2024 15:37:11 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rgstr (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:
  kube-api-access-rgstr:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  5m48s  default-scheduler  Successfully assigned nicklaus/httpd-pod to k8s-worker-1
  Normal  Pulling    5m47s  kubelet            Pulling image "harbor.nicklaus.com/library/httpd:latest"
  Normal  Pulled     5m47s  kubelet            Successfully pulled image "harbor.nicklaus.com/library/httpd:latest" in 498ms (498ms including waiting)
  Normal  Created    5m47s  kubelet            Created container container-httpd
  Normal  Started    5m46s  kubelet            Started container container-httpd
```
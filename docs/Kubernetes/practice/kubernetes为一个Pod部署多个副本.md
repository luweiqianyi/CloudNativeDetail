# kubernetes为一个Pod部署多个副本
## 背景
在服务端程序的运行过程中，需要保证服务端程序的高可用，不应该发生单点故障。对于访问量大的服务来说，特别是无状态服务，需要保证服务的高可用和自动伸缩，对于一个服务来说，可以使用`kubernetes`中的`Deployment`来部署多个副本，保证该服务的高可用。

## 定义Deployment描述文件
文件名为：`httpd-pod-deployment.yaml`，文件内容如下：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpd-pod-deployment
  namespace: nicklaus
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpd-pod
  template:
    metadata:
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

## 部署
```sh
[root@localhost kubernetes-practice]# kubectl apply -f httpd-pod-deployment.yaml 
deployment.apps/httpd-pod-deployment created
```
> 取消部署用命令`kubectl delete -f httpd-pod-deployment.yaml`即可

## 查看部署的Pod
```sh
[root@localhost kubernetes-practice]# kubectl get pods -n nicklaus -o wide
NAME                                   READY   STATUS    RESTARTS   AGE    IP             NODE           NOMINATED NODE   READINESS GATES
httpd-pod                              1/1     Running   0          51m    10.244.1.167   k8s-worker-1   <none>           <none>
httpd-pod-deployment-b99dcb587-46t6p   1/1     Running   0          2m9s   10.244.1.168   k8s-worker-1   <none>           <none>
httpd-pod-deployment-b99dcb587-kfgk2   1/1     Running   0          2m9s   10.244.1.169   k8s-worker-1   <none>           <none>
```
可以看到，在命名空间`nicklaus`下面部署了三个`Pod`，下面对三个`Pod`进行说明
* `httpd-pod`：这个`Pod`是用文章[kubernetes部署Pod](/Kubernetes/practice/kubernetes部署Pod)中的方式进行部署的`Pod`，它的`Name`就是我们指定的名字。
* `httpd-pod-deployment-b99dcb587-46t6p`和`httpd-pod-deployment-b99dcb587-kfgk2`：这两个`Pod`是本文用`Deployment`方式部署生成的，可以看到`Name`的末尾是一个随机名字。

## 总结
综上步骤，本文介绍了如何用`Deployment`来为一个服务部署多个副本。

扩展：试想这样一种场景，在实际业务场景中，由于用户的访问量是不确定的，那么对于本文中这种创建固定数量副本的方式照理说是不符合我们实际的业务场景的，如何让我们的服务随着访问量来自动伸缩就成了下一个要研究的问题，初步想想应该是动态改变`replicas: 2`的值，具体实践留到以后再说。
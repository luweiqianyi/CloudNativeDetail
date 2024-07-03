# kubernetes部署minio
## 准备部署描述文件
文件名`minio-dev.yaml`。
```yaml
# Deploys a new Namespace for the MinIO Pod
apiVersion: v1
kind: Namespace
metadata:
  name: minio-dev # Change this value if you want a different namespace name
  labels:
    name: minio-dev # Change this value to match metadata.name
---
# Deploys a new MinIO Pod into the metadata.namespace Kubernetes namespace
#
# The `spec.containers[0].args` contains the command run on the pod
# The `/data` directory corresponds to the `spec.containers[0].volumeMounts[0].mountPath`
# That mount path corresponds to a Kubernetes HostPath which binds `/data` to a local drive or volume on the worker node where the pod runs
# 
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: minio
  name: minio
  namespace: minio-dev # Change this value to match the namespace metadata.name
spec:
  containers:
  - name: minio
    image: quay.io/minio/minio:latest
    command:
    - /bin/bash
    - -c
    args: 
    - minio server /data --console-address :9090
    volumeMounts:
    - mountPath: /data
      name: localvolume # Corresponds to the `spec.volumes` Persistent Volume
  #nodeSelector:
    #kubernetes.io/hostname: localhost.localdomain # Specify a node label associated to the Worker Node on which you want to deploy the pod.
  volumes:
  - name: localvolume
    hostPath: # MinIO generally recommends using locally-attached volumes
      path: /mnt/disk1/data # Specify a path to a local drive or volume on the Kubernetes worker node
      type: DirectoryOrCreate # The path to the last directory must exist


---
apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: minio-dev
spec:
  type: NodePort
  selector:
    app: minio
  ports:
    - port: 9090
      targetPort: 9090
      nodePort: 31001

```
> 本文件基于[https://min.io/docs/minio/kubernetes/upstream/](https://min.io/docs/minio/kubernetes/upstream/)官方的部署文件，对其进行一定的修改，使用`NodePort`的`Service`端口映射方式来暴露访问端口。

## 部署
使用命令`kubectl apply -f minio-dev.yaml`在`kubernetes`中进行部署。

## 访问
部署成功后在浏览器中使用`http://IP:31001`进行访问，即可看到`minio`的`web`端登录界面。
|访问地址|账号|密码|
|---|---|---|
|http://IP:31001|minioadmin(默认)|minioadmin(默认)|
> 端口号是在`yaml`文件中指定的。

## 控制台访问
* 查询`pod`运行情况
    ```sh
    [root@localhost ~]# kubectl get pods -n minio-dev -o wide
    NAME    READY   STATUS    RESTARTS   AGE     IP             NODE           NOMINATED NODE   READINESS GATES
    minio   1/1     Running   0          2d20h   10.244.1.147   k8s-worker-1   <none>           <none>
    ```
# containerd配置使用自建的镜像仓库
## 背景
在我的`kubernetes`集群中，底层的容器运行时使用的是`containerd`。`containerd`默认的镜像源仓库地址为`registry-1.docker.io`。由于国内在`2024`年`6`月份因为一些恶心的原因将`Docker`的镜像源封禁之后，导致`containerd`在默认的镜像源拉取镜像就会失败，这样的话在`kubernetes`中部署`Pod`时，比如`kubectl apply -f nginx-pod.yaml`在拉取镜像时就会失败，导致`pod`部署失败。因此，这里有一个初步的想法就是，在自己本地的服务器上建立一个镜像仓库，让我们的集群在部署`pod`时，从这个镜像仓库来拉取镜像。这就是需要通过配置`containerd`的配置文件来完成这个过程。

在之前的文章[harbor-本地镜像仓库搭建](/Docker/practice/harbor-本地镜像仓库搭建)中，我们已经介绍了如何搭建本地镜像仓库，这里就不再赘述。

## containerd配置
`containerd`的配置文件在`/etc/containerd/config.toml`文件中。关于镜像仓库的配置，如下所示：
```toml
[plugins."io.containerd.grpc.v1.cri".registry]
  # 配置私有镜像地址为我的自建镜像仓库的地址 https://harbor.nicklaus.com
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."harbor.nicklaus.com"]
      endpoint = ["https://harbor.nicklaus.com"]
  
  # 配置连接自建仓库的账号信息和TLS配置
  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.nicklaus.com".tls]
      insecure_skip_verify = true
    [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.nicklaus.com".auth]
      username = "admin"
      password = "Harbor12345"
```

修改完配置后重启，使得配置生效
```sh
systemctl daemon-reload
systemctl restart containerd
```
> 非`root`用户需要在命令前面加上`sudo`。

## 出现的问题
* `kubernetes`中`containerd`拉取镜像时出现问题：`verify certificate: x509: certificate relies on legacy Common Name field, use SANs instead`。

这个问题出现的原因是`Harbor`的`TLS`证书不支持`Subject Alternative Names`，即`SANs`。根据[Harbor官方制作SSL证书](https://goharbor.io/docs/2.11.0/install-config/configure-https/)重新制作证书即可。下面给出步骤：
```sh
# 生成CA证书私钥
openssl genrsa -out ca.key 4096

# 生成CA证书
openssl req -x509 -new -nodes -sha512 -days 3650 \
 -subj "/C=CN/ST=Zhejiang/L=Hangzhou/O=example/OU=Personal/CN=MyPersonal Root CA" \
 -key ca.key \
 -out ca.crt

# 生成要保护站点的私钥
openssl genrsa -out harbor.nicklaus.com.key 4096

# 生成证书签名请求（CSR: certificate signing request）
openssl req -sha512 -new \
    -subj "/C=CN/ST=Zhejiang/L=Hangzhou/O=example/OU=Personal/CN=harbor.nicklaus.com" \
    -key harbor.nicklaus.com.key \
    -out harbor.nicklaus.com.csr

# 生成x509 v3扩展文件
cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=harbor.nicklaus.com
DNS.2=192.168.10.60
DNS.3=*
EOF

# 使用v3.ext为Harbor主机生成证书
openssl x509 -req -sha512 -days 3650 \
    -extfile v3.ext \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -in harbor.nicklaus.com.csr \
    -out harbor.nicklaus.com.crt
```

成功生成证书之后，就将证书拷贝到`Harbor`和`Docker`的配置路径下，即覆盖掉下面的文件即可
```sh
/etc/cert/harbor/harbor.nicklaus.com.crt
/etc/cert/harbor/harbor.nicklaus.com.key
/etc/docker/certs.d/harbor.nicklaus.com/harbor.nicklaus.com.crt
```
覆盖掉之后需要重启相关进程以保证配置生效。
* 重启`Harbor`: 进入目录重新执行脚本文件即可，因为脚本文件内有停止已运行容器和重启启动容器的命令。
```sh
cd /usr/local/harbor
./install.sh
```
* 重启`Docker`:
```sh
systemctl restart docker
```
> 非`root`用户需要在命令前面加上`sudo`。这里`docker`的作用就是验证`harbor.nicklaus.com`能否正常登录，能就说明证书配置没问题，具体命令`docker login harbor.nicklaus.com`。

## kubernetes部署Pod检验是否生效
关于在`kubernetes`中部署`pod`进行验证的过程详见文章[kubernetes部署Pod](/Kubernetes/practice/kubernetes部署Pod)即可。

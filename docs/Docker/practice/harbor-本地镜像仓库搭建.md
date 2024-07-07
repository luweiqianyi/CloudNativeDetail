# harbor-本地镜像仓库搭建
这里选择部署`Harbor`, `github`地址是：[https://github.com/goharbor/harbor](https://github.com/goharbor/harbor)。

## 1. 安装Docker
```shell
# 添加Docker Repo,这里设置成阿里源的地址，设置之前去请求一下是不是能够下载到docker-ce.repo这个文件来测试一下这个源是否有效
sudo dnf config-manager --add-repo=https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
 
# 更新源
sudo dnf update -y
 
# 安装Docker(这里除了安装docker-ce，还安装了其他4个组件)
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
 
# 启动Docker服务
sudo systemctl start docker && sudo systemctl status docker
 
# 设置开机自启动
sudo systemctl enable docker
 
# 建议添加普通用户至Docker组，并以普通用户运行Docker。
sudo usermod -aG docker $USER
 
# 生效组用户变更配置
newgrp docker
```
> 如果本地已经先安装了`containerd`,则在上面的第三条安装命令中把`containerd.io`去掉。

## 2. 安装go
* 下载
  ```shell
  wget https://mirrors.aliyun.com/golang/go1.20.linux-amd64.tar.gz
  ```
  > 去阿里源的镜像站下载，镜像站地址为：`https://mirrors.aliyun.com/golang/`，选择一个对应的版本即可!
* 解压
  ```shell
  rm -rf /usr/local/go && tar -C /usr/local -xzf go1.20.linux-amd64.tar.gz
  ```

## 3. 安装Harbor
* 下载
  ```shell
  wget https://github.com/goharbor/harbor/releases/download/v2.10.1/harbor-offline-installer-v2.10.1.tgz
  ```
  > `Harbor`的`github`地址为：`https://github.com/goharbor/harbor`，各个版本地址为：`https://github.com/goharbor/harbor/releases`，选择一个进行下载。
* 解压
  ```shell
  rm -rf /usr/local/harbor && tar -C /usr/local -zxvf harbor-offline-installer-v2.10.1.tgz
  ```

## 4. harbor推送镜像需要的ssl证书配置
### Harbor
* 生成证书
  ```shell
  # 生成SSL证书的私钥文件
  openssl genrsa -out harbor.nicklaus.com.key 2048
  # 通过生成的私钥文件生成证书签名文件(csr文件）
  openssl req -new -key harbor.nicklaus.com.key -out harbor.nicklaus.com.csr
  # 通过SSL证书的私钥文件和签名请求文件生成SSL证书
  openssl x509 -req -days 3650 -in harbor.nicklaus.com.csr -signkey harbor.nicklaus.com.key -out harbor.nicklaus.com.crt
  ```
  > 以上命令执行过程中`Common Name`要设置为要保护的域名，即下文说到的`harbor.nicklaus.com`。
* 安装证书(`harbor.yml`中指定了证书所在路径,以下路径需要和配置文件中的证书路径一致)
  ```shell
  mkdir -p /etc/cert/harbor
  cp harbor.nicklaus.com.crt harbor.nicklaus.com.key /etc/cert/harbor
  ```
### Docker
* 创建`docker`证书的存放位置
  ```shell
  mkdir -p /etc/docker/certs.d/harbor.nicklaus.com
  ```
* 进入之前创建`ssl`证书的目录，将证书文件拷贝到上面的路径下
  ```shell
  cp harbor.nicklaus.com.crt /etc/docker/certs.d/harbor.nicklaus.com
  ```

## 5. 配置harbor
* 修改`dns`
  ```shell
  echo "192.168.1.10(主机的IP地址) harbor.nicklaus.com" >>/etc/hosts
  ```
* 进入到我们安装`harbor`的目录，即:`/usr/local/harbor`)，拷贝模板配置文件并修改
  ```shell
  cp harbor.yml.tmpl harbor.yml
  vim harbor.yml
  ```
需要修改的项如下
```yaml
# DO NOT use localhost or 127.0.0.1, because Harbor needs to be accessed by external clients.
#建议使用域名
hostname: harbor.nicklaus.com
#修改证书位置
  certificate: /etc/cert/harbor/harbor.nicklaus.com.crt
  private_key: /etc/cert/harbor/harbor.nicklaus.com.key
#harbor密码
harbor_admin_password: Harbor12345
# Harbor数据库密码
database:
  # The password for the root user of Harbor DB. Change this before any production use.
  password: devops
#数据存储位置
data_volume: /data/harbor
```
> 默认的登录密码是`Harbor12345`，改成你自己的密码即可。
## 6. 安装并启动Harbor
`install.sh`脚本是安装`Harbor`的脚本，所以直接执行即可!
```shell
sh install.sh
```
安装并成功启动后会显示
```shell
✔ ----Harbor has been installed and started successfully.----
```
## 7. 浏览器登录
同局域网内，主机浏览器输入：`https://192.168.1.10(主机的IP地址)`即可，默认账号：`admin`，密码是之前在`yml`文件中配置的密码，即上面的`devops`。

## 8. 验证镜像推送
### 主机上登录
```shell
# 输入以下命令，然后按照提示输入账号密码即可
docker login harbor.nicklaus.com
```
登录成功会显示
```shell
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```
> `docker login harbor.nicklaus.com`命令在任意主机上都可以执行，只要域名`harbor.nicklaus.com`能被该主机解析即可。如果是自签名证书，执行这行命令的主机的`daemon.json`中需要进行相应配置，见文末章节中的说明即可。
### 镜像推送测试
* 将本地镜像重新打`tag`，然后推送到自己的本地仓库
  ```shell
  docker tag nginx:1.24.0 harbor.nicklaus.com/library/nginx:1.24.0
  docker push harbor.nicklaus.com/library/nginx:1.24.0
  ```
  > 打`tag`前需要保证本地存在`nginx:1.24.0`，没有的话使用`docker pull nginx:1.24.0`从远程拉取下来
* 推送成功的输出如下所示：
  ```shell
  The push refers to repository [harbor.nicklaus.com/library/nginx]
  34f2ddeba3a9: Pushed 
  0c47a9442648: Pushed 
  cfd3c53af539: Pushed 
  9dd63f53efa4: Pushed 
  b24e38f26f5b: Pushed 
  3c8879ab2cf2: Pushed 
  1.24.0: digest: sha256:c2285269cc20838076d30251c9b65e6fcea272cab26661170084fbfc49b3b144 size: 1570
  ```
* 然后在浏览器中进行验证，输入：`https://192.168.1.10/harbor/projects/1/repositories`，就可以在`library`下面看到刚才推送的镜像了，如下图所示
![](/harbor-image-repository-library.png)

## 其他需要注意的
1. 如果当中因为步骤错误，需要重新部署，但是只执行`docker-compose up -d`失败，系统系统没有`docker-compose`时，需要重新删除和`harbor`相关的所有容器，然后重新执行`sh install.sh`即可。
2. `docker`停止并删除所有容器：`docker stop $(docker ps -aq) && docker rm $(docker ps -aq)`
3. `docker login harbor.nicklaus.com`可能出现如下问题
```sh
Error response from daemon: Get "https://harbor.nicklaus.com/v2/": tls: failed to verify certificate: x509: certificate relies on legacy Common Name field, use SANs instead
```
解决方案：在`daemon.json`中的最外层结构中添加如下一行
```json
"insecure-registries": ["https://harbor.nicklaus.com","https://192.168.1.10"]
```
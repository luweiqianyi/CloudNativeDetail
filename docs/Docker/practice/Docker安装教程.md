# Docker安装教程
## Docker版本
`Docker Engine - Community Edition`
## 安装步骤
::: code-group
```sh [Ubuntu]
#!/bin/bash

# Remove existing Docker packages
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    sudo apt-get remove $pkg -y
done

# Remove Docker directories
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# Update package manager
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Setup Docker repository key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to package manager
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$UBUNTU_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package manager again
sudo apt-get update

# Find available Docker CE versions and extract the first one
VERSION_STRING=$(apt-cache madison docker-ce | awk '{ print $3 }' | head -n 1)

# Install specific version of Docker CE and related packages
sudo apt-get install -y docker-ce=$VERSION_STRING docker-ce-cli=$VERSION_STRING containerd.io docker-buildx-plugin docker-compose-plugin
```

```sh [RockyLinux]
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
:::

> `Ubuntu`平台上，把上面的内容保存到一个`shell`脚本中，然后直接执行脚本文件即可。`RockyLinux`平台则按顺序执行命令即可。

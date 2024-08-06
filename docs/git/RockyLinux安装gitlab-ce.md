# RockyLinux安装gitlab-ce
目的：在自己的内网服务器上安装自己的代码托管服务器。

```shell
sudo yum install -y curl policycoreutils-python openssh-server perl

sudo systemctl enable sshd
sudo systemctl start sshd

sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo systemctl reload firewalld

# 跟邮件相关的组件
sudo yum install postfix
sudo systemctl enable postfix
sudo systemctl start postfix

# 这里选择gitlab-ce版本，不选择gitlab-ee版本
curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.rpm.sh | sudo bash

# 配置局域网访问IP并安装gitlab-ce
sudo EXTERNAL_URL="https://IP" yum install -y gitlab-ce

# 教程地址：https://about.gitlab.com/install/#centos-7
```
# Linux系统安装git
## Ubuntu
* 查看`git`是否安装
    ```shell
    ubuntu@hostname:~$ git --version
    -bash: /usr/bin/git: No such file or directory
    ```
    > 如上表示`git`没有安装
* 安装`git`
    ```shell
    sudo apt-get install git
    ```
    > 使用上述命令安装最新稳定版本
* 查看安装的`git`版本
    ```shell
    ubuntu@hostname:~$ git --version
    git version 2.34.1
    ```
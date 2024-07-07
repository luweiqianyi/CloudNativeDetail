# 服务器部署nginx
## 部署过程
`nginx`在服务端的部署有两种方式选择
* 用包管理工具来进行部署安装
* 下载`nginx`源码，编译源码并部署安装

这两种方式都行，前者方便，后者可以自定义添加不同模块，比如`rtmp`模块。

### 包管理工具方式安装
不同发行版的`Linux`系统使用不同的包管理工具对软件包进行管理，比如`Ubuntu`用`apt`，`RockyLinux`用`dnf`或者`yum`。
这里我们拿`RockyLinux`系统上的部署，进行简要说明。

部署(安装)命令只有一条，即：
```sh
sudo dnf install nginx
```

安装成功后可以使用以下命令查看`nginx`是否安装成功
```sh
[ecs-user@k8s-worker-1 nginx]$ nginx -v
nginx version: nginx/1.20.1
[ecs-user@k8s-worker-1 nginx]$ whereis nginx
nginx: /usr/sbin/nginx /usr/lib64/nginx /etc/nginx /usr/share/nginx /usr/share/man/man3/nginx.3pm.gz /usr/share/man/man8/nginx.8.gz
```
> 在执行安装成功前，是没有上面的输出的。

下面对上面的输出进行一个详细的说明：
* `/usr/sbin/nginx`: `/usr/sbin`目录是`Linux`系统中`root`用户存放系统管理程序和系统服务程序的目录。而`/usr/sbin/nginx`就是我们的`nginx`可执行程序的全路径。
* `/usr/lib64/nginx`: 这是一个目录，用来存放`nginx`所使用的库文件或者其他二进制文件。它的目录结构如下所示：
    ```sh
    [ecs-user@k8s-worker-1 nginx]$ tree /usr/lib64/nginx
    /usr/lib64/nginx
    └── modules

    1 directory, 0 files
    ```
* `/etc/nginx`: 这是一个目录，用来存放`nginx`配置文件的目录。它的目录结构如下所示：
    ```sh
    [ecs-user@k8s-worker-1 nginx]$ tree /etc/nginx
    /etc/nginx
    ├── conf.d
    ├── default.d
    ├── fastcgi.conf
    ├── fastcgi.conf.default
    ├── fastcgi_params
    ├── fastcgi_params.default
    ├── koi-utf
    ├── koi-win
    ├── mime.types
    ├── mime.types.default
    ├── nginx.conf
    ├── nginx.conf.default
    ├── scgi_params
    ├── scgi_params.default
    ├── uwsgi_params
    ├── uwsgi_params.default
    └── win-utf

    2 directories, 15 files
    ```
    > 其中`conf.d`和`default.d`是两个目录。前者存放自定义服务的配置文件，后者存放默认服务的配置文件。
* `/usr/share/nginx`：存放静态资源的目录。
    ```sh
    [ecs-user@k8s-worker-1 nginx]$ tree /usr/share/nginx
    /usr/share/nginx
    ├── html
    │   ├── 404.html
    │   ├── 50x.html
    │   ├── icons
    │   │   └── poweredby.png -> ../../../pixmaps/poweredby.png
    │   ├── index.html -> ../../testpage/index.html
    │   ├── nginx-logo.png
    │   ├── poweredby.png -> nginx-logo.png
    │   └── system_noindex_logo.png -> ../../pixmaps/system-noindex-logo.png
    └── modules

    3 directories, 7 files
    ```
* `/usr/share/man/man3/nginx.3pm.gz`和`/usr/share/man/man8/nginx.8.gz`: 这些是`Nginx`的手册页文件。它们提供了关于`Nginx命令`和库函数的详细文档，用于在终端使用`man`命令查看。

安装成功后，查看`nginx`是否启动：
```sh
[ecs-user@k8s-worker-1 nginx]$ sudo systemctl status nginx
○ nginx.service - The nginx HTTP and reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; disabled; preset: disabled)
     Active: inactive (dead)
```
> 可以看到，`nginx`服务没有启动。
同时，可以用`curl`命令来访问一下`nginx`地址来达到验证是否启动的同等效果
```sh
[ecs-user@k8s-worker-1 nginx]$ curl 127.0.0.1:80
curl: (7) Failed to connect to 127.0.0.1 port 80: Connection refused
```
接下来，执行以下命令来启动`nginx`:
```sh
sudo systemctl start nginx
```
启动后接着用上面两种方式来查看是否成功启动：
* `sudo systemctl status nginx`：
    ::: details systemctl方式验证
    ```sh
    [ecs-user@k8s-worker-1 nginx]$ sudo systemctl status nginx
    ● nginx.service - The nginx HTTP and reverse proxy server
        Loaded: loaded (/usr/lib/systemd/system/nginx.service; disabled; preset: disabled)
        Active: active (running) since Sun 2024-07-07 19:29:41 CST; 3s ago
        Process: 868060 ExecStartPre=/usr/bin/rm -f /run/nginx.pid (code=exited, status=0/SUCCESS)
        Process: 868061 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=0/SUCCESS)
        Process: 868062 ExecStart=/usr/sbin/nginx (code=exited, status=0/SUCCESS)
    Main PID: 868063 (nginx)
        Tasks: 3 (limit: 10596)
        Memory: 4.5M
            CPU: 20ms
        CGroup: /system.slice/nginx.service
                ├─868063 "nginx: master process /usr/sbin/nginx"
                ├─868064 "nginx: worker process"
                └─868065 "nginx: worker process"

    Jul 07 19:29:41 k8s-worker-1 systemd[1]: Starting The nginx HTTP and reverse proxy server...
    Jul 07 19:29:41 k8s-worker-1 nginx[868061]: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
    Jul 07 19:29:41 k8s-worker-1 nginx[868061]: nginx: configuration file /etc/nginx/nginx.conf test is successful
    Jul 07 19:29:41 k8s-worker-1 systemd[1]: Started The nginx HTTP and reverse proxy server.
    ```
    :::
* `curl 127.0.0.1:80`：
    ::: details curl方式验证
    ```sh
    [ecs-user@k8s-worker-1 nginx]$ curl 127.0.0.1:80
    <!doctype html>
    <html>
    <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <title>HTTP Server Test Page powered by: Rocky Linux</title>
        <style type="text/css">
        /*<![CDATA[*/
        
        html {
            height: 100%;
            width: 100%;
        }  
            body {
    background: rgb(20,72,50);
    background: -moz-linear-gradient(180deg, rgba(23,43,70,1) 30%, rgba(0,0,0,1) 90%)  ;
    background: -webkit-linear-gradient(180deg, rgba(23,43,70,1) 30%, rgba(0,0,0,1) 90%) ;
    background: linear-gradient(180deg, rgba(23,43,70,1) 30%, rgba(0,0,0,1) 90%);
    background-repeat: no-repeat;
    background-attachment: fixed;
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#3c6eb4",endColorstr="#3c95b4",GradientType=1); 
            color: white;
            font-size: 0.9em;
            font-weight: 400;
            font-family: 'Montserrat', sans-serif;
            margin: 0;
            padding: 10em 6em 10em 6em;
            box-sizing: border-box;      
            
        }

    
    h1 {
        text-align: center;
        margin: 0;
        padding: 0.6em 2em 0.4em;
        color: #fff;
        font-weight: bold;
        font-family: 'Montserrat', sans-serif;
        font-size: 2em;
    }
    h1 strong {
        font-weight: bolder;
        font-family: 'Montserrat', sans-serif;
    }
    h2 {
        font-size: 1.5em;
        font-weight:bold;
    }
    
    .title {
        border: 1px solid black;
        font-weight: bold;
        position: relative;
        float: right;
        width: 150px;
        text-align: center;
        padding: 10px 0 10px 0;
        margin-top: 0;
    }
    
    .description {
        padding: 45px 10px 5px 10px;
        clear: right;
        padding: 15px;
    }
    
    .section {
        padding-left: 3%;
    margin-bottom: 10px;
    }
    
    img {
    
        padding: 2px;
        margin: 2px;
    }
    a:hover img {
        padding: 2px;
        margin: 2px;
    }

    :link {
        color: rgb(199, 252, 77);
        text-shadow:
    }
    :visited {
        color: rgb(122, 206, 255);
    }
    a:hover {
        color: rgb(16, 44, 122);
    }
    .row {
        width: 100%;
        padding: 0 10px 0 10px;
    }
    
    footer {
        padding-top: 6em;
        margin-bottom: 6em;
        text-align: center;
        font-size: xx-small;
        overflow:hidden;
        clear: both;
    }
    
    .summary {
        font-size: 140%;
        text-align: center;
    }

    #rocky-poweredby img {
        margin-left: -10px;
    }

    #logos img {
        vertical-align: top;
    }
    
    /* Desktop  View Options */
    
    @media (min-width: 768px)  {
    
        body {
        padding: 10em 20% !important;
        }
        
        .col-md-1, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6,
        .col-md-7, .col-md-8, .col-md-9, .col-md-10, .col-md-11, .col-md-12 {
        float: left;
        }
    
        .col-md-1 {
        width: 8.33%;
        }
        .col-md-2 {
        width: 16.66%;
        }
        .col-md-3 {
        width: 25%;
        }
        .col-md-4 {
        width: 33%;
        }
        .col-md-5 {
        width: 41.66%;
        }
        .col-md-6 {
        border-left:3px ;
        width: 50%;
        

        }
        .col-md-7 {
        width: 58.33%;
        }
        .col-md-8 {
        width: 66.66%;
        }
        .col-md-9 {
        width: 74.99%;
        }
        .col-md-10 {
        width: 83.33%;
        }
        .col-md-11 {
        width: 91.66%;
        }
        .col-md-12 {
        width: 100%;
        }
    }
    
    /* Mobile View Options */
    @media (max-width: 767px) {
        .col-sm-1, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6,
        .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-10, .col-sm-11, .col-sm-12 {
        float: left;
        }
    
        .col-sm-1 {
        width: 8.33%;
        }
        .col-sm-2 {
        width: 16.66%;
        }
        .col-sm-3 {
        width: 25%;
        }
        .col-sm-4 {
        width: 33%;
        }
        .col-sm-5 {
        width: 41.66%;
        }
        .col-sm-6 {
        width: 50%;
        }
        .col-sm-7 {
        width: 58.33%;
        }
        .col-sm-8 {
        width: 66.66%;
        }
        .col-sm-9 {
        width: 74.99%;
        }
        .col-sm-10 {
        width: 83.33%;
        }
        .col-sm-11 {
        width: 91.66%;
        }
        .col-sm-12 {
        width: 100%;
        }
        h1 {
        padding: 0 !important;
        }
    }
            
    
    </style>
    </head>
    <body>
        <h1>HTTP Server <strong>Test Page</strong></h1>

        <div class='row'>
        
        <div class='col-sm-12 col-md-6 col-md-6 '></div>
            <p class="summary">This page is used to test the proper operation of
                an HTTP server after it has been installed on a Rocky Linux system.
                If you can read this page, it means that the software is working
                correctly.</p>
        </div>
        
        <div class='col-sm-12 col-md-6 col-md-6 col-md-offset-12'>
        
        
            <div class='section'>
            <h2>Just visiting?</h2>

            <p>This website you are visiting is either experiencing problems or
            could be going through maintenance.</p>

            <p>If you would like the let the administrators of this website know
            that you've seen this page instead of the page you've expected, you
            should send them an email. In general, mail sent to the name
            "webmaster" and directed to the website's domain should reach the
            appropriate person.</p>

            <p>The most common email address to send to is:
            <strong>"webmaster@example.com"</strong></p>
        
            <h2>Note:</h2>
            <p>The Rocky Linux distribution is a stable and reproduceable platform
            based on the sources of Red Hat Enterprise Linux (RHEL). With this in
            mind, please understand that:

            <ul>
            <li>Neither the <strong>Rocky Linux Project</strong> nor the
            <strong>Rocky Enterprise Software Foundation</strong> have anything to
            do with this website or its content.</li>
            <li>The Rocky Linux Project nor the <strong>RESF</strong> have
            "hacked" this webserver: This test page is included with the
            distribution.</li>
            </ul>
            <p>For more information about Rocky Linux, please visit the
            <a href="https://rockylinux.org/"><strong>Rocky Linux
            website</strong></a>.
            </p>
            </div>
        </div>
        <div class='col-sm-12 col-md-6 col-md-6 col-md-offset-12'>
            <div class='section'>
            
            <h2>I am the admin, what do I do?</h2>

            <p>You may now add content to the webroot directory for your
            software.</p>

            <p><strong>For systems using the
            <a href="https://httpd.apache.org/">Apache Webserver</strong></a>:
            You can add content to the directory <code>/var/www/html/</code>.
            Until you do so, people visiting your website will see this page. If
            you would like this page to not be shown, follow the instructions in:
            <code>/etc/httpd/conf.d/welcome.conf</code>.</p>

            <p><strong>For systems using
            <a href="https://nginx.org">Nginx</strong></a>:
            You can add your content in a location of your
            choice and edit the <code>root</code> configuration directive
            in <code>/etc/nginx/nginx.conf</code>.</p>
            
            <div id="logos">
            <a href="https://rockylinux.org/" id="rocky-poweredby"><img src="icons/poweredby.png" alt="[ Powered by Rocky Linux ]" /></a> <!-- Rocky -->
            <img src="poweredby.png" /> <!-- webserver -->
            </div>       
        </div>
        </div>
        
        <footer class="col-sm-12">
        <a href="https://apache.org">Apache&trade;</a> is a registered trademark of <a href="https://apache.org">the Apache Software Foundation</a> in the United States and/or other countries.<br />
        <a href="https://nginx.org">NGINX&trade;</a> is a registered trademark of <a href="https://">F5 Networks, Inc.</a>.
        </footer>
        
    </body>
    </html>
    ```
    :::
* 补充另外一种方式：用浏览器访问，即浏览器中输入：`http://IP地址`，访问结果如下所示：
    ![img](/nginx-test-page.png)
    > 注意：如果用的是阿里云服务器，需要在端口上对`80`端口进行放行。
### 从源码构建安装
::: details 下面的过程暂时不成功，先省略，不要看这部分，等我实践成功再更新
下载`Linux`源码，不要去`github`下载，不要去`github`下载，不要去`github`下载(重要的事情说三遍：因为`github`的版本是缺少东西的，编译源码的时候会发行错误！)，完整版本去这个地址下载：[http://nginx.org/download/](http://nginx.org/download/)，选择对应的版本，比如我选择的是`1.27.0`，下载地址就是：[http://nginx.org/download/nginx-1.27.0.tar.gz](http://nginx.org/download/nginx-1.27.0.tar.gz)。
* 下载：
    ```sh
    wget https://github.com/PCRE2Project/pcre2/archive/refs/tags/pcre2-10.39.tar.gz
    wget https://github.com/madler/zlib/archive/refs/tags/v1.3.tar.gz
    wget -c http://nginx.org/download/nginx-1.27.0.tar.gz
    ```
* 解压
    ```sh
    tar -zxvf nginx-1.27.0.tar.gz
    ```
* 配置
```sh
./configure --sbin-path=/usr/local/nginx-1.27.0 --with-http_ssl_module --with-pcre=../pcre2-10.39 --with-zlib=../zlib-1.3
```
:::

## 将自己的项目部署到nginx
### 打包上传项目
这里我们将我们自己的前端项目部署到我们通过`sudo dnf install nginx`方式安装的`nginx`中。以本站点为例，本站点是一个用[vitepress](https://vitepress.dev/)搭建的静态站点，使用`npm run docs:build`后会生成一个`dist`目录，这个目录就是最终需要打包到`Linux`服务器上去的。在我们的`nginx`中，我们前面已经介绍过，我们的静态资源是放在`/usr/share/nginx`目录中的。这里我们在`/usr/share/nginx/html`目录下新建一个目录`nicklaus-tech-website`，用于放置`dist`目录下的所有文件。这里用`scp`命令进行传输，完整步骤如下所示：
* 进入`dist`目录，打包本地`dist`目录
    ```sh
    tar -czvf nicklaus-tech-website.tar.gz .
    ```
* 上传打包好的压缩包到目的服务器主机
    ```sh
    scp .\nicklaus-tech-website.tar.gz ecs-user@118.31.170.164:/home/ecs-user/programs-to-deploy/
    ```
* 在服务器主机解压文件
    ```sh
    cd /home/ecs-user/programs-to-deploy && mkdir -p /home/ecs-user/programs-to-deploy/nicklaus-tech-website && tar -zxvf nicklaus-tech-website.tar.gz -C ./nicklaus-tech-website
    ```
    解压后的目录结构如下所示：
    ::: details programs-to-deploy目录下的情况
    ```sh
    [ecs-user@k8s-worker-1 programs-to-deploy]$ tree
    .
    ├── nicklaus-tech-website
    │   ├── 404.html
    │   ├── about
    │   │   └── me.html
    │   ├── assets
    │   │   ├── about_me.md.daXr3w-I.js
    │   │   ├── about_me.md.daXr3w-I.lean.js
    │   │   ├── app.DfDoYA91.js
    │   │   ├── chunks
    │   │   │   ├── framework.BuaBLesI.js
    │   │   │   ├── @localSearchIndexroot.M2oPALxc.js
    │   │   │   ├── theme.B_BL7D6T.js
    │   │   │   └── VPLocalSearchBox.B46Lagod.js
    │   │   ├── containerd_containerd配置使用自建的镜像仓库.md.CKsnTYQP.js
    │   │   ├── containerd_containerd配置使用自建的镜像仓库.md.CKsnTYQP.lean.js
    │   │   ├── Docker_practice_Docker安装教程.md.BH2VHmMd.js
    │   │   ├── Docker_practice_Docker安装教程.md.BH2VHmMd.lean.js
    │   │   ├── Docker_practice_harbor-本地镜像仓库搭建.md.DowCG-mx.js
    │   │   ├── Docker_practice_harbor-本地镜像仓库搭建.md.DowCG-mx.lean.js
    │   │   ├── index.md.BZ3NKcDX.js
    │   │   ├── index.md.BZ3NKcDX.lean.js
    │   │   ├── inter-italic-cyrillic.By2_1cv3.woff2
    │   │   ├── inter-italic-cyrillic-ext.r48I6akx.woff2
    │   │   ├── inter-italic-greek.DJ8dCoTZ.woff2
    │   │   ├── inter-italic-greek-ext.1u6EdAuj.woff2
    │   │   ├── inter-italic-latin.C2AdPX0b.woff2
    │   │   ├── inter-italic-latin-ext.CN1xVJS-.woff2
    │   │   ├── inter-italic-vietnamese.BSbpV94h.woff2
    │   │   ├── inter-roman-cyrillic.C5lxZ8CY.woff2
    │   │   ├── inter-roman-cyrillic-ext.BBPuwvHQ.woff2
    │   │   ├── inter-roman-greek.BBVDIX6e.woff2
    │   │   ├── inter-roman-greek-ext.CqjqNYQ-.woff2
    │   │   ├── inter-roman-latin.Di8DUHzh.woff2
    │   │   ├── inter-roman-latin-ext.4ZJIpNVo.woff2
    │   │   ├── inter-roman-vietnamese.BjW4sHH5.woff2
    │   │   ├── Kubernetes_kubelet_002-kubelet信息查看.md.CySz1zfv.js
    │   │   ├── Kubernetes_kubelet_002-kubelet信息查看.md.CySz1zfv.lean.js
    │   │   ├── Kubernetes_kubelet_003-kubelet子模块-云资源同步.md.CSQ2RTOl.js
    │   │   ├── Kubernetes_kubelet_003-kubelet子模块-云资源同步.md.CSQ2RTOl.lean.js
    │   │   ├── Kubernetes_kubelet_004-kubelet子模块-metrics.md.Bin6CGUf.js
    │   │   ├── Kubernetes_kubelet_004-kubelet子模块-metrics.md.Bin6CGUf.lean.js
    │   │   ├── Kubernetes_kubelet_005-kubelet子模块-ImageGCManager.md.CkmEckUd.js
    │   │   ├── Kubernetes_kubelet_005-kubelet子模块-ImageGCManager.md.CkmEckUd.lean.js
    │   │   ├── Kubernetes_kubelet_006-kubelet子模块-serverCertificateManager.md.BUaVvkC7.js
    │   │   ├── Kubernetes_kubelet_006-kubelet子模块-serverCertificateManager.md.BUaVvkC7.lean.js
    │   │   ├── Kubernetes_kubelet_007-kubelet子模块-oomWatcher.md.Kcymi-cf.js
    │   │   ├── Kubernetes_kubelet_007-kubelet子模块-oomWatcher.md.Kcymi-cf.lean.js
    │   │   ├── Kubernetes_kubelet_008-kubelet子模块-resourceAnalyzer.md.Dmbs_vWA.js
    │   │   ├── Kubernetes_kubelet_008-kubelet子模块-resourceAnalyzer.md.Dmbs_vWA.lean.js
    │   │   ├── Kubernetes_kubelet_009-kubelet子模块-volumeManager.md.CN86eaey.js
    │   │   ├── Kubernetes_kubelet_009-kubelet子模块-volumeManager.md.CN86eaey.lean.js
    │   │   ├── Kubernetes_practice_001-Kubernetes安装教程.md.kfGYGhZw.js
    │   │   ├── Kubernetes_practice_001-Kubernetes安装教程.md.kfGYGhZw.lean.js
    │   │   ├── Kubernetes_practice_kubernetes为一个Pod部署多个副本.md.CzNPVVe2.js
    │   │   ├── Kubernetes_practice_kubernetes为一个Pod部署多个副本.md.CzNPVVe2.lean.js
    │   │   ├── Kubernetes_practice_kubernetes部署minio.md.BLwNYk8N.js
    │   │   ├── Kubernetes_practice_kubernetes部署minio.md.BLwNYk8N.lean.js
    │   │   ├── Kubernetes_practice_kubernetes部署Pod.md.DUcnhjpf.js
    │   │   ├── Kubernetes_practice_kubernetes部署Pod.md.DUcnhjpf.lean.js
    │   │   ├── Kubernetes_practice_kubernetes部署service暴露端口.md.B2QlhygE.js
    │   │   ├── Kubernetes_practice_kubernetes部署service暴露端口.md.B2QlhygE.lean.js
    │   │   ├── Kubernetes_practice_部署同目录下多个yaml的shell脚本.md.BquGrm7w.js
    │   │   ├── Kubernetes_practice_部署同目录下多个yaml的shell脚本.md.BquGrm7w.lean.js
    │   │   ├── Linux_cat命令格式化显示Json数据.md.Ckya_jVm.js
    │   │   ├── Linux_cat命令格式化显示Json数据.md.Ckya_jVm.lean.js
    │   │   ├── Linux_Linux命令大全.md.DgSYKtTR.js
    │   │   ├── Linux_Linux命令大全.md.DgSYKtTR.lean.js
    │   │   ├── Linux_创建软链接.md.Br68_Iz-.js
    │   │   ├── Linux_创建软链接.md.Br68_Iz-.lean.js
    │   │   ├── nginx_服务器部署nginx.md.DoZmLlYt.js
    │   │   ├── nginx_服务器部署nginx.md.DoZmLlYt.lean.js
    │   │   └── style.DvwsvGG9.css
    │   ├── containerd
    │   │   └── containerd配置使用自建的镜像仓库.html
    │   ├── Docker
    │   │   └── practice
    │   │       ├── Docker安装教程.html
    │   │       └── harbor-本地镜像仓库搭建.html
    │   ├── harbor-image-repository-library.png
    │   ├── hashmap.json
    │   ├── index.html
    │   ├── Kubernetes
    │   │   ├── kubelet
    │   │   │   ├── 002-kubelet信息查看.html
    │   │   │   ├── 003-kubelet子模块-云资源同步.html
    │   │   │   ├── 004-kubelet子模块-metrics.html
    │   │   │   ├── 005-kubelet子模块-ImageGCManager.html
    │   │   │   ├── 006-kubelet子模块-serverCertificateManager.html
    │   │   │   ├── 007-kubelet子模块-oomWatcher.html
    │   │   │   ├── 008-kubelet子模块-resourceAnalyzer.html
    │   │   │   └── 009-kubelet子模块-volumeManager.html
    │   │   └── practice
    │   │       ├── 001-Kubernetes安装教程.html
    │   │       ├── kubernetes为一个Pod部署多个副本.html
    │   │       ├── kubernetes部署minio.html
    │   │       ├── kubernetes部署Pod.html
    │   │       ├── kubernetes部署service暴露端口.html
    │   │       └── 部署同目录下多个yaml的shell脚本.html
    │   ├── Linux
    │   │   ├── cat命令格式化显示Json数据.html
    │   │   ├── Linux命令大全.html
    │   │   └── 创建软链接.html
    │   ├── logo.svg
    │   ├── nginx
    │   │   └── 服务器部署nginx.html
    │   ├── nginx-test-page.png
    │   ├── nicklaus-tech-website.tar.gz
    │   └── vitepress-logo-large.webp
    └── nicklaus-tech-website.tar.gz

    12 directories, 97 files
    ``` 
    :::
* 将`nicklaus-tech-website`整个目录拷贝到`/usr/share/nginx/html/`下，这个步骤需要提权(提升为`root`权限)
    ```sh
    cp -r /home/ecs-user/programs-to-deploy/nicklaus-tech-website /usr/share/nginx/html/
    ```
### 在nginx中配置打包的项目
在前面已经说过，`/etc/nginx`这个目录是存放配置文件的目录，该目录下的`conf.d`目录用来存放我们自己项目的服务配置。所以在这个目录下新建一个`nicklaus-tech-website.conf`，文件内容如下所示：
```conf
server {
    listen       81;
    listen       [::]:81;
    server_name  _;
    root         /usr/share/nginx/html/nicklaus-tech-website;

    error_page 404 /404.html;
    location = /404.html {
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
    }
}
```
::: details 服务器上新建并写入文件的命令如下所示
```sh
cat >> nicklaus-tech-website.conf << EOF
server {
    listen       81;
    listen       [::]:81;
    server_name  _;
    root         /usr/share/nginx/html/nicklaus-tech-website;

    error_page 404 /404.html;
    location = /404.html {
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
    }
}
EOF
```
:::
### 配置完成后，让nginx重新加载配置
重新加载配置的命令如下所示
```sh
nginx -s reload
```
### 如果项目部署在阿里云等云服务器上，需要在网络安全组打开81端口的访问
除此之外，还需要让本地防火墙允许`81`端口的流量，鉴于我的系统是`RockyLinux`，所以我的防火墙是`firewalld`，下面给出一些对`firewalld`防火墙进行操作的命令
::: details
查看已放行端口
```sh
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --list-ports
80/tcp 443/tcp
```
允许某个端口的流量通过防火墙
```sh
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --zone=public --add-port=81/tcp --permanent
success
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --reload
success
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --list-ports
80/tcp 81/tcp 443/tcp
```
> 要使添加规则生效必须调用`sudo firewall-cmd --reload`使其生效
禁止某个端口的流量通过防火墙
```sh
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --zone=public --remove-port=81/tcp --permanen
t
success
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --reload
success
[ecs-user@k8s-worker-1 programs-to-deploy]$ sudo firewall-cmd --list-ports
80/tcp 443/tcp
```
> 这里，我们不需要删除`81/tcp`流量规则。这里只是给出示例而已。
:::
### 访问测试
这里上文提到的测试方法中的其中一种，使用浏览器访问即可，效果如下：
![img](/nicklaus-tech-website.png)
# git命令
## 推送本地仓库到远程服务器
1. 添加远程仓库地址，并设置别名为`origin`
```sh
git remote add origin https://github.com/luweiqianyi/stock.git 
```
2. 查看本地分支
```sh
D:\Code\2024\stock>git branch                                                     
* master
```
> 这里可以看到本地只有一个`master`分支
3. 将本地`master`分支推送到远程仓库
```sh
git push -u origin master 
```
## 若之前已经添加过origin，后面忘记了是否添加过，如何验证
* 方法1
    ```sh
    D:\Code\2024\stock>git remote show origin    
    * remote origin
    Fetch URL: https://github.com/luweiqianyi/stock.git
    Push  URL: https://github.com/luweiqianyi/stock.git
    HEAD branch: (unknown)
    Remote branch:
        refs/remotes/origin/master stale (use 'git remote prune' to remove)
    Local branch configured for 'git pull':
        master merges with remote master
    ```
* 方法2
    ```sh
    D:\Code\2024\stock>git remote get-url origin 
    https://github.com/luweiqianyi/stock.git
    ```
* 二者区别
    * 前者会连接远程仓库，显示远程仓库的详细信息
    * 后者只是显示`url`信息

## 暂存某次修改
* 暂存某次改动：`git stash`
* 取消暂存某次改动：`git stash pop`
* 查看暂存的改动：`git stash list`
* 删除某次暂存的改动：`git stash drop stash@{n}`
* 清除所有暂存的改动：`git stash clear`

## 代理配置与取消
原因是国内网络无法访问`github`，需要将`git`的请求代理到本地代理服务上，然后才能与远程`github`进行数据传输
    ```sh
    git config --global https.proxy http://127.0.0.1:7890
    git config --global https.proxy https://127.0.0.1:7890
    git config --global --unset http.proxy
    git config --global --unset https.proxy
    ```
    > 配置后，`.gitconfig`文件中会保存如上配置，后面两条命令是取消代理

## tag
1. 查看所有`tag`
```sh
git tag
```

## 分支
1. 查看所有分支
```sh
git branch
```
2. 创建一个新的分支
```sh
git branch new-branch-name
```
> `new-branch-name`是将要创建的分支的名字
3. 切换到新创建的分支
```sh
git checkout new-branch-name
```
4. 删除分支
* 警告并确认方式的删除：待删除的分支没有完全合并到当前分支，使用`-d`选项时`git`会给出一个警告
    ```sh
    git branch -d new-branch-name
    ```
    > 当前已经切换到主分支，然后执行上述命令，想要删除刚创建的`new-branch-name`分支
* 强制删除分支: 不会警告，直接将分支删除
    ```sh
    git branch -D new-branch-name
    ```
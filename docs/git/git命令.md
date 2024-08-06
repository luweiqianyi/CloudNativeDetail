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
* 案例分析：本地文件发生改动，在`git stash`执行之前，直接使用命令`git pull origin master`拉取远程文件到本地时发生错误时使用，错误提示为："error: Your local changes to the following files would be overwritten by merge:"。正确使用案例为：
    ```shell
    git stash
    git pull origin master
    git stash pop
    ```

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
5. `git checkout`创建新分支并切换
    ```sh
    git checkout -b new-branch-name
    ```
    > 使用`-b`加待创建的分支的名字来进行创建，并切换到新创建的分支。若待创建的分支已经存在会报错。
6.  将新创建的分支推送到远程仓库，让远程仓库也有这个分支
    ```sh
    git push origin new_branch_name:new_branch_name
    ```
    > 这里指定远程分支和本地分支同名
7. 删除远程分支
* 推送一个空分支以达到删除的目的
    ```sh
    git push origin :new_branch_name
    ```
* 使用`--delete`进行删除
    ```sh
    git push origin --delete new_branch_name
    ```
8. 合并分支
    ```sh
    git merge branch-name
    ```
    > 发生的场景为：假如某个分支为代码提交的基准分支，比如说`master`分支，然后这时候需要修改一些代码并通过测试，这时候采取的策略可以是新建一个分支，比如名字叫做`branch-name`，当`branch-name`分支上的代码通过测试之后，需要将修改合并到`master`分支。则可以用`git merge`将分支`branch-name`上的修改合并到`master`分支。注意：`git merge`命令的执行是在合并的目地分支上进行，即上文说到的`master`分支。
## 日志
* 查看提交的日志记录
```sh
PS D:\Code\github.com\luweiqianyi\CloudNativeDetail> git log
commit fa64ca65d72549dad373913ad83dd03ec06e3bf0 (HEAD -> test, origin/main, main)
Author: luweiqianyi <runningriven@163.com>
Date:   Wed Aug 7 00:00:09 2024 +0800

    增加git栏目：增加相关文章

commit 55b086b541b3e40d785e55096ba005865d6d3bf7
Author: nicklaus <runningriven@gmail.com>
Date:   Tue Aug 6 22:38:57 2024 +0800

    站点主界面介绍修改

commit ec9a97799b833c9192b369057a432b5cb121d38d
Author: nicklaus <runningriven@gmail.com>
Date:   Tue Aug 6 22:36:20 2024 +0800

    README修改
```
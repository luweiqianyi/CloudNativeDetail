# Linux命令大全
## 文件
* 删除某个目录下以某个后缀结尾的所有文件，比如`.log`后缀
```sh
find . -type f -name "*.log" -delete
```
> `.`表示当前目录，`-type f`表示指定的为文件。
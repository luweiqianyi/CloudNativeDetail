# cat命令格式化显示Json数据
1. 安装json格式化工具
::: code-group
```sh [Debian/Ubuntu]
sudo apt-get install jq
```

```sh [CentOS/RHEL]
sudo yum install jq
```
:::
2. 不用`jq`工具之前的`json`数据显示
```sh
[root@localhost harbor]# cat 00648af8a25d88f4bd4fe78c33f6d2cc326573f04fc5b35e24576112b6a5484e/json
{"id":"00648af8a25d88f4bd4fe78c33f6d2cc326573f04fc5b35e24576112b6a5484e","parent":"c48731ecda9c955f003cb4240e3f24e39f602dbb677e6f9c04b1c8be9e061f20","created":"1970-01-01T00:00:00Z","container_config":{"Hostname":"","Domainname":"","User":"","AttachStdin":false,"AttachStdout":false,"AttachStderr":false,"Tty":false,"OpenStdin":false,"StdinOnce":false,"Env":null,"Cmd":null,"Image":"","Volumes":null,"WorkingDir":"","Entrypoint":null,"OnBuild":null,"Labels":null},"os":"linux"}
```
3. 使用`jq`工具之后的`json`显示
```sh
[root@localhost harbor]# cat 00648af8a25d88f4bd4fe78c33f6d2cc326573f04fc5b35e24576112b6a5484e/json | jq .
{
  "id": "00648af8a25d88f4bd4fe78c33f6d2cc326573f04fc5b35e24576112b6a5484e",
  "parent": "c48731ecda9c955f003cb4240e3f24e39f602dbb677e6f9c04b1c8be9e061f20",
  "created": "1970-01-01T00:00:00Z",
  "container_config": {
    "Hostname": "",
    "Domainname": "",
    "User": "",
    "AttachStdin": false,
    "AttachStdout": false,
    "AttachStderr": false,
    "Tty": false,
    "OpenStdin": false,
    "StdinOnce": false,
    "Env": null,
    "Cmd": null,
    "Image": "",
    "Volumes": null,
    "WorkingDir": "",
    "Entrypoint": null,
    "OnBuild": null,
    "Labels": null
  },
  "os": "linux"
}
```
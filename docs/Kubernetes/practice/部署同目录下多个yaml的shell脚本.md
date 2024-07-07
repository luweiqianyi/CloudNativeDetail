# 部署同目录下多个yaml的shell脚本
文件名：`deploy-all.sh`，文件内容如下：
```sh
#!/bin/bash

files=("namespace-nicklaus.yaml" "httpd-pod-deployment.yaml" "httpd-pod-service.yaml" "httpd-pod-ingress.yaml")

operation=$1

for file in "${files[@]}"
do
  if [ "$operation"=="apply" ];then
    kubectl apply -f "$file"
  elif [ "$operation"=="delete" ];then
    kubectl delete -f "$file"
  fi

  # 判断操作是否成功，输出操作结果
  if [ $? -ne 0 ];then
    if [ "$operation"=="apply" ];then
      echo "kubectl apply -f $file failed, exiting..."
    elif [ "$operation"=="delete" ];then
      echo "kubectl delete -f $file failed, exiting..."
    fi
    exit 1
  else
    if [ "$operation"=="apply" ];then
      echo "kubectl apply -f $file success."
    elif [ "$operation"=="delete" ];then
      echo "kubectl delete -f $file success."
    fi
  fi 
done
```

脚本执行前赋予`可执行`权限：`chmod +x deploy-all.sh`

用法：
* 部署：`deploy-all apply`
* 取消部署：`deploy-all delete`
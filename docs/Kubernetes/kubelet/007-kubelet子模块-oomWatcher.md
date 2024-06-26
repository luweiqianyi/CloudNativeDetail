# kubelet子模块-oomWatcher
## 功能
## 创建
::: details 创建`oomWatcher`对象
```go
// 创建oomWatcher对象
oomWatcher, err := oomwatcher.NewWatcher(kubeDeps.Recorder)

// 指定Kubelet的oomWatcher为上面的oomWatcher对象

// NewWatcher的实现如下
func NewWatcher(recorder record.EventRecorder) (Watcher, error) {
	// for test purpose
	_, ok := recorder.(*record.FakeRecorder)
	if ok {
		return nil, nil
	}

	oomStreamer, err := oomparser.New()
	if err != nil {
		return nil, err
	}

	watcher := &realWatcher{
		recorder:    recorder,
		oomStreamer: oomStreamer,
	}

	return watcher, nil
}
```
:::
## 运行
::: details 启动运行`oomWatcher`
```go
if kl.oomWatcher != nil {
    if err := kl.oomWatcher.Start(kl.nodeRef); err != nil {
		return fmt.Errorf("failed to start OOM watcher: %w", err)
	}
}
```
:::

::: details `Start`的内部实现 启动两个协程：一个协程负责检测`oom`事件，检测到事件则往`outStream`通道写入；一个协程负责从`outStream`通道读取`oom`事件，根据事件类型来决定是否要用`recoder`对象来向某个目的地发送该事件。
```go
func (ow *realWatcher) Start(ref *v1.ObjectReference) error {
	outStream := make(chan *oomparser.OomInstance, 10)
	go ow.oomStreamer.StreamOoms(outStream)

	go func() {
		defer runtime.HandleCrash()

		for event := range outStream {
			if event.VictimContainerName == recordEventContainerName {
				klog.V(1).InfoS("Got sys oom event", "event", event)
				eventMsg := "System OOM encountered"
				if event.ProcessName != "" && event.Pid != 0 {
					eventMsg = fmt.Sprintf("%s, victim process: %s, pid: %d", eventMsg, event.ProcessName, event.Pid)
				}
				ow.recorder.Eventf(ref, v1.EventTypeWarning, systemOOMEvent, eventMsg)
			}
		}
		klog.ErrorS(nil, "Unexpectedly stopped receiving OOM notifications")
	}()
	return nil
}
```
:::

::: details 往`outStream`通道写入的详细逻辑：从`kmsgEntries`通道中不断读取消息，检查是否是`oom`事件(判定逻辑是字符串里面是否有`invoked oom-killer:`)，如果是`oom`事件，创建一个`OomInstance`实例对象，设置完相关属性后将其写入`outStream`通道。
```go
func (p *OomParser) StreamOoms(outStream chan<- *OomInstance) {
	kmsgEntries := p.parser.Parse()
	defer p.parser.Close()

	for msg := range kmsgEntries {
		isOomMessage := checkIfStartOfOomMessages(msg.Message)
		if isOomMessage {
			oomCurrentInstance := &OomInstance{
				ContainerName:       "/",
				VictimContainerName: "/",
				TimeOfDeath:         msg.Timestamp,
			}
			for msg := range kmsgEntries {
				finished, err := getContainerName(msg.Message, oomCurrentInstance)
				if err != nil {
					klog.Errorf("%v", err)
				}
				if !finished {
					finished, err = getProcessNamePid(msg.Message, oomCurrentInstance)
					if err != nil {
						klog.Errorf("%v", err)
					}
				}
				if finished {
					oomCurrentInstance.TimeOfDeath = msg.Timestamp
					break
				}
			}
			outStream <- oomCurrentInstance
		}
	}
	// Should not happen
	klog.Errorf("exiting analyzeLines. OOM events will not be reported.")
}
```
:::

::: details 往`kmsgEntries`通道中写入消息的详细逻辑。本质上是从`/dev/kmsg`路径读取消息数据，然后封装成消息，往通道中写入，并返回该通道，该通道即`kmsgEntries`。
```go
// 创建过程：打开一个本地文件描述符对象，指向的路径为"/dev/kmsg"
func NewParser() (Parser, error) {
	f, err := os.Open("/dev/kmsg")
	if err != nil {
		return nil, err
	}

	bootTime, err := getBootTime()
	if err != nil {
		return nil, err
	}

	return &parser{
		log:        &StandardLogger{nil},
		kmsgReader: f,
		bootTime:   bootTime,
	}, nil
}

// 启动一个协程，将从"/dev/kmsg"中读取到数据封装成一个消息对象，写到通道中。
func (p *parser) Parse() <-chan Message {

	output := make(chan Message, 1)

	go func() {
		defer close(output)
		msg := make([]byte, 8192)
		for {
			// Each read call gives us one full message.
			// https://www.kernel.org/doc/Documentation/ABI/testing/dev-kmsg
			n, err := p.kmsgReader.Read(msg)
			if err != nil {
				if err == syscall.EPIPE {
					p.log.Warningf("short read from kmsg; skipping")
					continue
				}

				if err == io.EOF {
					p.log.Infof("kmsg reader closed, shutting down")
					return
				}

				p.log.Errorf("error reading /dev/kmsg: %v", err)
				return
			}

			msgStr := string(msg[:n])

			message, err := p.parseMessage(msgStr)
			if err != nil {
				p.log.Warningf("unable to parse kmsg message %q: %v", msgStr, err)
				continue
			}

			output <- message
		}
	}()

	return output
}
```
:::
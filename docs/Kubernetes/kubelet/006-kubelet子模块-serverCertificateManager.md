# kubelet子模块-serverCertificateManager
## 功能
## 创建过程
::: details 创建。本质上是一个`certificate.Manager`实例。该实例负责证书相关的管理工作。
```go
klet.serverCertificateManager, err = kubeletcertificate.NewKubeletServerCertificateManager(klet.kubeClient, kubeCfg, klet.nodeName, klet.getLastObservedNodeAddresses, certDirectory)

func NewKubeletServerCertificateManager(kubeClient clientset.Interface, kubeCfg *kubeletconfig.KubeletConfiguration, nodeName types.NodeName, getAddresses func() []v1.NodeAddress, certDirectory string) (certificate.Manager, error) {
	var clientsetFn certificate.ClientsetFunc
	if kubeClient != nil {
		clientsetFn = func(current *tls.Certificate) (clientset.Interface, error) {
			return kubeClient, nil
		}
	}
	certificateStore, err := certificate.NewFileStore(
		"kubelet-server",
		certDirectory,
		certDirectory,
		kubeCfg.TLSCertFile,
		kubeCfg.TLSPrivateKeyFile)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize server certificate store: %v", err)
	}
	var certificateRenewFailure = compbasemetrics.NewCounter(
		&compbasemetrics.CounterOpts{
			Subsystem:      metrics.KubeletSubsystem,
			Name:           "server_expiration_renew_errors",
			Help:           "Counter of certificate renewal errors.",
			StabilityLevel: compbasemetrics.ALPHA,
		},
	)
	legacyregistry.MustRegister(certificateRenewFailure)

	certificateRotationAge := compbasemetrics.NewHistogram(
		&compbasemetrics.HistogramOpts{
			Subsystem: metrics.KubeletSubsystem,
			Name:      "certificate_manager_server_rotation_seconds",
			Help:      "Histogram of the number of seconds the previous certificate lived before being rotated.",
			Buckets: []float64{
				60,        // 1  minute
				3600,      // 1  hour
				14400,     // 4  hours
				86400,     // 1  day
				604800,    // 1  week
				2592000,   // 1  month
				7776000,   // 3  months
				15552000,  // 6  months
				31104000,  // 1  year
				124416000, // 4  years
			},
			StabilityLevel: compbasemetrics.ALPHA,
		},
	)
	legacyregistry.MustRegister(certificateRotationAge)

	getTemplate := func() *x509.CertificateRequest {
		hostnames, ips := addressesToHostnamesAndIPs(getAddresses())
		// don't return a template if we have no addresses to request for
		if len(hostnames) == 0 && len(ips) == 0 {
			return nil
		}
		return &x509.CertificateRequest{
			Subject: pkix.Name{
				CommonName:   fmt.Sprintf("system:node:%s", nodeName),
				Organization: []string{"system:nodes"},
			},
			DNSNames:    hostnames,
			IPAddresses: ips,
		}
	}

	m, err := certificate.NewManager(&certificate.Config{
		ClientsetFn:             clientsetFn,
		GetTemplate:             getTemplate,
		SignerName:              certificates.KubeletServingSignerName,
		GetUsages:               certificate.DefaultKubeletServingGetUsages,
		CertificateStore:        certificateStore,
		CertificateRotation:     certificateRotationAge,
		CertificateRenewFailure: certificateRenewFailure,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize server certificate manager: %v", err)
	}
	legacyregistry.RawMustRegister(compbasemetrics.NewGaugeFunc(
		&compbasemetrics.GaugeOpts{
			Subsystem: metrics.KubeletSubsystem,
			Name:      "certificate_manager_server_ttl_seconds",
			Help: "Gauge of the shortest TTL (time-to-live) of " +
				"the Kubelet's serving certificate. The value is in seconds " +
				"until certificate expiry (negative if already expired). If " +
				"serving certificate is invalid or unused, the value will " +
				"be +INF.",
			StabilityLevel: compbasemetrics.ALPHA,
		},
		func() float64 {
			if c := m.Current(); c != nil && c.Leaf != nil {
				return math.Trunc(time.Until(c.Leaf.NotAfter).Seconds())
			}
			return math.Inf(1)
		},
	))
	return m, nil
}
```
:::
## 运行过程
::: details `serverCertificateManager`启动
```go
if kl.serverCertificateManager != nil {
	kl.serverCertificateManager.Start()
}
```
:::

::: details 具体运行情况 启动两个协程：一个协程负责证书的轮换，主要是`rotateCerts`函数的内部实现；另外一个协程负责往`templateChanged`模板中发送事件，负责证书轮换的协程会发现该通道中有数据就会进行相应处理。
```go
func (m *manager) Start() {
	// Certificate rotation depends on access to the API server certificate
	// signing API, so don't start the certificate manager if we don't have a
	// client.
	if m.clientsetFn == nil {
		m.logf("%s: Certificate rotation is not enabled, no connection to the apiserver", m.name)
		return
	}
	m.logf("%s: Certificate rotation is enabled", m.name)

	templateChanged := make(chan struct{})
	go wait.Until(func() {
		deadline := m.nextRotationDeadline()
		if sleepInterval := deadline.Sub(m.now()); sleepInterval > 0 {
			m.logf("%s: Waiting %v for next certificate rotation", m.name, sleepInterval)

			timer := time.NewTimer(sleepInterval)
			defer timer.Stop()

			select {
			case <-timer.C:
				// unblock when deadline expires
			case <-templateChanged:
				_, lastRequestTemplate := m.getLastRequest()
				if reflect.DeepEqual(lastRequestTemplate, m.getTemplate()) {
					// if the template now matches what we last requested, restart the rotation deadline loop
					return
				}
				m.logf("%s: Certificate template changed, rotating", m.name)
			}
		}

		// Don't enter rotateCerts and trigger backoff if we don't even have a template to request yet
		if m.getTemplate() == nil {
			return
		}

		backoff := wait.Backoff{
			Duration: 2 * time.Second,
			Factor:   2,
			Jitter:   0.1,
			Steps:    5,
		}
		if err := wait.ExponentialBackoff(backoff, m.rotateCerts); err != nil {
			utilruntime.HandleError(fmt.Errorf("%s: Reached backoff limit, still unable to rotate certs: %v", m.name, err))
			wait.PollInfinite(32*time.Second, m.rotateCerts)
		}
	}, time.Second, m.stopCh)

	if m.dynamicTemplate {
		go wait.Until(func() {
			// check if the current template matches what we last requested
			lastRequestCancel, lastRequestTemplate := m.getLastRequest()

			if !m.certSatisfiesTemplate() && !reflect.DeepEqual(lastRequestTemplate, m.getTemplate()) {
				// if the template is different, queue up an interrupt of the rotation deadline loop.
				// if we've requested a CSR that matches the new template by the time the interrupt is handled, the interrupt is disregarded.
				if lastRequestCancel != nil {
					// if we're currently waiting on a submitted request that no longer matches what we want, stop waiting
					lastRequestCancel()
				}
				select {
				case templateChanged <- struct{}{}:
				case <-m.stopCh:
				}
			}
		}, time.Second, m.stopCh)
	}
}
```
:::

::: details `rotateCerts`的内部实现 本质上是向远程发送请求，根据请求结果更新本地的`crtPEM`, `keyPEM`文件
```go
func (m *manager) rotateCerts() (bool, error) {
	m.logf("%s: Rotating certificates", m.name)

	template, csrPEM, keyPEM, privateKey, err := m.generateCSR()
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("%s: Unable to generate a certificate signing request: %v", m.name, err))
		if m.certificateRenewFailure != nil {
			m.certificateRenewFailure.Inc()
		}
		return false, nil
	}

	// request the client each time
	clientSet, err := m.getClientset()
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("%s: Unable to load a client to request certificates: %v", m.name, err))
		if m.certificateRenewFailure != nil {
			m.certificateRenewFailure.Inc()
		}
		return false, nil
	}

	getUsages := m.getUsages
	if m.getUsages == nil {
		getUsages = DefaultKubeletClientGetUsages
	}
	usages := getUsages(privateKey)
	// Call the Certificate Signing Request API to get a certificate for the
	// new private key
	reqName, reqUID, err := csr.RequestCertificate(clientSet, csrPEM, "", m.signerName, m.requestedCertificateLifetime, usages, privateKey)
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("%s: Failed while requesting a signed certificate from the control plane: %v", m.name, err))
		if m.certificateRenewFailure != nil {
			m.certificateRenewFailure.Inc()
		}
		return false, m.updateServerError(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), certificateWaitTimeout)
	defer cancel()

	// Once we've successfully submitted a CSR for this template, record that we did so
	m.setLastRequest(cancel, template)

	// Wait for the certificate to be signed. This interface and internal timout
	// is a remainder after the old design using raw watch wrapped with backoff.
	crtPEM, err := csr.WaitForCertificate(ctx, clientSet, reqName, reqUID)
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("%s: certificate request was not signed: %v", m.name, err))
		if m.certificateRenewFailure != nil {
			m.certificateRenewFailure.Inc()
		}
		return false, nil
	}

	cert, err := m.certStore.Update(crtPEM, keyPEM)
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("%s: Unable to store the new cert/key pair: %v", m.name, err))
		if m.certificateRenewFailure != nil {
			m.certificateRenewFailure.Inc()
		}
		return false, nil
	}

	if old := m.updateCached(cert); old != nil && m.certificateRotation != nil {
		m.certificateRotation.Observe(m.now().Sub(old.Leaf.NotBefore).Seconds())
	}

	return true, nil
}
```
:::
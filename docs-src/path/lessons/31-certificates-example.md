---
id: 3.2
stage: health
order: 2
title: Checking certificates (an example)
summary: An illustrative example of how a service certificate is checked. The lab has no TLS, so nothing here was run.
objectives:
  - You can say what a certificate check looks at.
  - You can read a good result and two bad ones.
prerequisites: [3.1]
example: true
noDiagramReason: The lesson is a worked example of one command and its results; no structure or flow needs a picture.
---
## Description

**The lab has no TLS and no certificates.** Kafka, Kafka Connect, the web UI and the database talk in plain text on your own machine, and the lab says so (its security checks record that TLS and SASL were not performed). So there is no certificate to verify here, and this lesson does not pretend there is.

In a real deployment the services would use TLS, and "healthy" would also mean "the certificate is valid". This lesson shows what that check looks like, as an example you can adapt.

<div class="example-box">

**Example, not run in this lab. The output below is invented for illustration.** The host names, the dates and the certificate details do not exist. They only show the shape of the results.

To look at a service's certificate you ask the service to start a TLS conversation and print what it presents. With `openssl`:

```bash
openssl s_client -connect kafka.example.com:9093 -servername kafka.example.com -verify_hostname kafka.example.com </dev/null
```

A **good** result ends with a verification code of 0:

```text
subject=CN = kafka.example.com
issuer=CN = Example Internal CA
notBefore=Jan  1 00:00:00 2026 GMT
notAfter=Dec 31 23:59:59 2026 GMT
Verify return code: 0 (ok)
```

An **expired** certificate gives:

```text
notAfter=Jun 30 23:59:59 2025 GMT
Verify return code: 10 (certificate has expired)
```

A certificate **issued for another name** gives:

```text
Verify return code: 62 (Hostname mismatch, certificate is not valid for 'kafka.example.com')
```

</div>

What the three results mean:

- **Code 0** means the certificate chains to a certificate authority you trust, has not expired and names the host you asked for.
- **Code 10** means the dates are wrong: renew the certificate before it expires, not after.
- **Code 62** means the certificate was issued for a different host name: the client would refuse to connect, which is what you want.

On the Java side, the connector and Kafka Connect would also need a truststore (the certificate authorities they trust) and, for client certificates, a keystore. `keytool -list -keystore <file>` shows what is in one. The settings that point at them depend on the service and were not tested here.

## Steps

### 1. What you would do in a TLS-enabled environment

Everything above is the step: run the `openssl` command against each TLS port and read the verification code. There is no recorded output for it because there is nothing to run in this lab.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Everything in this lesson. The lab has no TLS; the commands and results above are an illustration and were not run.
- Keystores, truststores and the connector's and Kafka Connect's TLS settings.

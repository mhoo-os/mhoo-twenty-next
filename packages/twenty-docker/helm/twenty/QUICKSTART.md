# Mhoo Helm distribution - Quick Install

## Simple Install

Set your domain and install:

```bash
export DOMAIN=crm.example.com

helm install my-twenty ./packages/twenty-docker/helm/twenty \
  --namespace twentycrm --create-namespace --wait \
  --set "server.ingress.hosts[0].host=$DOMAIN" \
  --set "server.ingress.tls[0].hosts[0]=$DOMAIN"
```

That's it! The chart will present the Mhoo distribution, built on Twenty, and will:
- Auto-generate a secure access token
- Create the PostgreSQL database "twenty" and schema "core" automatically
- Run TypeORM migrations via server init
- Enable TLS via cert-manager (acme: true by default for letsencrypt-prod)
- Pass the reviewed Mhoo brand preset and the public deployment origin to the server and worker

## Access the App

Visit the Mhoo application at `https://$DOMAIN`.

Sign up to create your admin account through the web UI.

## Retrieve System Credentials

App secret token (for configuration/integrations):
```bash
kubectl get secret tokens -n twentycrm -o jsonpath='{.data.accessToken}' | base64 --decode && echo
```

Internal PostgreSQL credentials are managed by the chart and not exposed by default. If you need direct access, create your own user in the database pod or use an external PostgreSQL instance.

Jobs for DB creation and migrations have been removed to simplify deployments; the server handles readiness and migrations at startup.

## Advanced Configuration

See [full README](README.md) for:
- External PostgreSQL/Redis
- S3 storage configuration
- Custom resource limits
- Product brand preset and deployment-origin settings

## Uninstall

```bash
helm uninstall my-twenty -n twentycrm
kubectl delete namespace twentycrm
```

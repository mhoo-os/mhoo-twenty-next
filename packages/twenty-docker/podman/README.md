# How to deploy Mhoo (built on Twenty) on Podman

DISCLAIMER: The Kubernetes and Podman recipes are community-maintained source
examples. They do not constitute a live Mhoo deployment or release proof.


## How to use

1. Edit `.env`. At minimum set `POSTGRES_PASSWORD`, `SERVER_URL`,
   `PRODUCT_BRAND_DEPLOYMENT_ORIGIN`, and `APP_SECRET`. The brand origin must
   be the same `http(s)` origin as `SERVER_URL`, without a path or query.
   `PRODUCT_BRAND_PRESET=mhoo` is the default; `twenty` is only an explicit
   upstream-compatibility fixture.
2. Start Mhoo by running `podman-compose up -d`.

If you need to stop Mhoo, run `podman-compose down`.


### Install systemd service (optional)

If you want to install a systemd service to run twenty, you can use the provided systemd service. 

Edit `twentycrm.service` and change these two variables:


	WorkingDirectory=/opt/apps/twenty
	EnvironmentFile=/opt/apps/twenty/.env

`WorkingDirectory` should be changed to the path in which `podman-compose.yml` is located.

`EnvironmentFile` should be changed to the path in which your `.env`file is located.

You can run the script `install-systemd-user-service` to install the systemd service under the current user.


	./install-systemd-user-service

Note: this script will enable the service and also start it. It assumes that
the Mhoo stack is not currently running.
If you started it previously, bring it down using:

	podman-compose down



## Compatibility

These files should be compatible with podman 4.3+.

I have tested this on Debian GNU/Linux 12 (bookworm) and with the podman that is distributed with the official Debian stable mirrors (podman v4.3.1+ds1-8+deb12u1, podman-compose v1.0.3-3).


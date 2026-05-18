#!/usr/bin/env bash
# Run this once on a fresh Amazon Linux 2023 ARM64 instance as ec2-user
set -euo pipefail

echo "==> Installing Docker..."
sudo dnf update -y
sudo dnf install -y docker git

echo "==> Starting Docker..."
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "==> Installing Docker Compose plugin..."
COMPOSE_VERSION="v2.27.1"
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "==> Installing Nginx + Certbot..."
sudo dnf install -y nginx python3-certbot-nginx
sudo systemctl enable nginx

echo "==> Cloning repo..."
git clone https://github.com/Danultimate/evalify.git /home/ec2-user/evalify
chown -R ec2-user:ec2-user /home/ec2-user/evalify

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Log out and back in (so docker group takes effect)"
echo "  2. cd ~/evalify"
echo "  3. cp .env.example .env && nano .env   # fill in your API keys"
echo "  4. sudo cp nginx.conf /etc/nginx/nginx.conf"
echo "     # Edit /etc/nginx/nginx.conf: replace evalkit.danblanco.dev with your domain"
echo "  5. sudo certbot --nginx -d evalkit.danblanco.dev"
echo "  6. ./deploy.sh"

# SSL Certificates Directory

Place your SSL certificates here for production HTTPS deployment.

## Files Needed

For production deployment with HTTPS:

1. **cert.pem** - SSL certificate
2. **key.pem** - Private key
3. **chain.pem** - Certificate chain (optional)

## Using Let's Encrypt

To generate free SSL certificates with Let's Encrypt:

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be in:
# /etc/letsencrypt/live/your-domain.com/

# Copy to this directory:
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./key.pem
```

## Self-Signed Certificate (Development Only)

For development/testing purposes only:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem
```

⚠️ **Warning**: Self-signed certificates should NOT be used in production.

## Security

- Never commit SSL certificates to version control
- Keep private keys secure
- Rotate certificates before expiration
- Use strong encryption (RSA 2048+ or ECC 256+)

## Notes

These files are ignored by git (see .gitignore).
Make sure to backup your certificates securely.

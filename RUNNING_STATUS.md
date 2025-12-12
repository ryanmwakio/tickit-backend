# TixHub Services - Running Status

## ✅ Services Running

### Backend (NestJS)
- **Status**: ✅ Running
- **Port**: 5000
- **Health Check**: http://localhost:5000/api/v1/health
- **API Base**: http://localhost:5000/api/v1
- **Swagger Docs**: http://localhost:5000/api/docs
- **Process**: Running in background

### Frontend (Next.js)
- **Status**: ✅ Running
- **Port**: 3001 (3000 was in use)
- **URL**: http://localhost:3001
- **Process**: Running in background

## Notes

### File Watcher Warnings
The frontend shows `EMFILE: too many open files` warnings. This is a system limit issue and doesn't prevent the application from running. To fix:

```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Port Configuration
- Backend uses port 5000 (configurable via `PORT` env var)
- Frontend automatically uses next available port (3001) if 3000 is in use

## Quick Commands

### Check Backend Health
```bash
curl http://localhost:5000/api/v1/health
```

### Check Frontend
```bash
curl http://localhost:3001
```

### Stop Services
```bash
# Stop backend
pkill -f "node.*tixhub-backend"

# Stop frontend
pkill -f "next dev"
```

## Next Steps

1. Open http://localhost:3001 in your browser
2. Test API endpoints via Swagger: http://localhost:5000/api/docs
3. Test real-time notifications via WebSocket connection
4. Test live streaming functionality


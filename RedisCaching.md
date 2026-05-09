# Redis Caching Phase 1

This project now uses Redis as a cache in front of MongoDB for doctor read endpoints.

## What Learners Should Notice

The app still treats MongoDB as the source of truth.
Redis only stores temporary copies of frequently requested doctor data.

Implemented endpoints:

- `GET /api/admin/doctorlist/doctors`
- `GET /api/admin/doctorlist/doctors/:id`

Write operations invalidate the cache:

- `POST /api/admin/doctorlist/doctors`
- `PUT /api/admin/doctorlist/doctors/:id`
- `DELETE /api/admin/doctorlist/doctors/:id`

## Pattern Used

This implementation uses the cache-aside pattern:

1. Check Redis for a cached value.
2. If found, return it immediately.
3. If not found, fetch from MongoDB.
4. Save the MongoDB response to Redis with a TTL.
5. On writes, delete the affected cache keys.

## Cache Keys

- Doctor list: `doctors:all`
- Single doctor: `doctors:<doctorId>`

## Files To Teach From

- [config/redis.js](/home/riddhisuteri/Desktop/project/cn-workshops/cn-hms/config/redis.js)
- [services/cacheService.js](/home/riddhisuteri/Desktop/project/cn-workshops/cn-hms/services/cacheService.js)
- [controllers/doctorListController.js](/home/riddhisuteri/Desktop/project/cn-workshops/cn-hms/controllers/doctorListController.js)

## Useful Talking Points

- Why caching is best for read-heavy routes.
- Why TTL matters.
- Why invalidation is required after writes.
- Why the server should still work if Redis is down.
- Why authentication and caching solve different problems.

## Suggested Demo Flow

1. Start MongoDB and Redis locally.
2. Load the doctor list endpoint once and show `meta.source = "database"`.
3. Load it again and show `meta.source = "cache"`.
4. Add or delete a doctor.
5. Load the doctor list again and show that the cache was invalidated.

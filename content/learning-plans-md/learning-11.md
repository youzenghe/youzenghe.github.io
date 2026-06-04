# Redis 面试八股精华

> 整理自小林coding 8.Redis面试篇 + 你的 Redis 学习计划
> 模块顺序与你学习计划一致
> ⭐⭐⭐ = 必背；🔴 = 简历强相关

---

## 目录

- [一、数据结构与基础应用（15 题）](#一数据结构与基础应用15-题)
- [二、缓存核心问题（必考王炸，12 题）](#二缓存核心问题必考王炸12-题)
- [三、分布式锁 + Lua（简历核心，13 题）🔴](#三分布式锁--lua简历核心13-题)
- [四、持久化与高可用（15 题）](#四持久化与高可用15-题)
- [五、内存管理与淘汰（10 题）](#五内存管理与淘汰10-题)
- [六、单线程与网络模型（10 题）](#六单线程与网络模型10-题)
- [七、底层数据结构原理（12 题）](#七底层数据结构原理12-题)
- [八、实战场景（10 题）](#八实战场景10-题)
- [九、Redis + MySQL 一致性（专题，6 题）](#九redis--mysql-一致性专题6-题)
- [十、高频追问串讲](#十高频追问串讲)

---

# 一、数据结构与基础应用（15 题）

> 对应学习计划 1：数据结构 + SpringDataRedis 入门

## 1. Redis 五种基本数据类型 ⭐⭐⭐
| 类型 | 应用场景 |
|---|---|
| **String** | 验证码、Token、计数器、JSON 缓存对象 |
| **Hash** | 对象属性（可改单字段）、购物车 |
| **List** | 消息队列、最新文章列表 |
| **Set** | 标签、点赞用户集合、共同好友（交集）|
| **ZSet** | 排行榜、延迟队列、按时间分片 |

## 2. Redis 5 种特殊数据类型
| 类型 | 用途 |
|---|---|
| **BitMap** | 签到、用户在线状态（1bit/人）|
| **HyperLogLog** | UV 统计（百万级数据 12KB）|
| **GEO** | 地理位置（附近的人/店）|
| **Stream**（5.0+）| 消息队列（替代 List 和 PubSub）|
| **Bitfield** | 操作位段 |

## 3. String 的最大长度
**512MB**。底层是 SDS（动态字符串），不是 C 原生字符串。

## 4. String 底层为什么用 SDS 不用 C 字符串 ⭐⭐⭐
| | C 字符串 | SDS |
|---|---|---|
| 长度获取 | O(n) 遍历找 \0 | **O(1)** 直接读 len |
| 缓冲区溢出 | 容易 | **自动扩容** |
| 二进制安全 | ❌（遇 \0 截断）| ✅ |
| 内存预分配 | ❌ | ✅（减少 realloc）|
| 惰性释放 | ❌ | ✅ |

## 5. List 适合做消息队列吗
**简单场景可以**：
- 生产端 `LPUSH`，消费端 `BRPOP`（阻塞读）
- 缺点：
  1. **没有 ACK 机制**（消息消费失败丢失）
  2. **不能多消费者分组**
  3. 历史消息无法回溯

**生产推荐**：用 **Stream**（5.0+）替代。

## 6. ZSet 底层为什么用跳表不用红黑树 ⭐⭐⭐
| | 跳表 | 红黑树 |
|---|---|---|
| 查找 | O(log n) | O(log n) |
| 插入/删除 | O(log n) | O(log n) + 旋转 |
| 范围查询 | **极快**（链表直接走）| 慢（中序遍历）|
| 实现难度 | 简单 | 复杂 |
| 内存 | 略多 | 紧凑 |

**核心理由**：Redis 大量范围操作（`ZRANGE` / `ZRANGEBYSCORE`），跳表的链表结构天然适合。

## 7. ZSet 怎么实现排行榜
```redis
ZADD rank 100 user:1     # 加分
ZINCRBY rank 10 user:1   # 加10分
ZREVRANGE rank 0 9 WITHSCORES  # Top 10
ZREVRANK rank user:1      # 查我的排名
```

## 8. Hash vs String 存对象 ⭐
| | String 存 JSON | Hash |
|---|---|---|
| 改单字段 | 反序列化整个对象 | 直接 `HSET` |
| 读单字段 | 同上 | 直接 `HGET` |
| 内存 | 略小（无 field 开销）| 略大 |
| 适用 | 整体读写 | 频繁改单字段 |

**经验**：详情用 String，购物车/用户配置用 Hash。

## 9. Redis 通用命令
- `KEYS pattern`：**生产禁用！会阻塞**
- `SCAN cursor`：游标分批扫描，**生产用这个**
- `EXPIRE key seconds`：设过期
- `TTL key`：剩余存活时间（-1 永久、-2 不存在）
- `TYPE key`：查类型
- `DEL key`：删除

## 10. KEYS 为什么不能用 ⭐
- Redis 单线程，KEYS 是 O(n) 遍历所有 key
- 数据量大时**阻塞 Redis 几秒甚至几十秒**
- 期间所有请求都被卡

**替代**：`SCAN` 游标，每次返回少量 + 下次游标。

## 11. SpringDataRedis 核心 API ⭐
```java
@Autowired RedisTemplate<String, Object> redisTemplate;
@Autowired StringRedisTemplate stringRedisTemplate;

// 操作
redisTemplate.opsForValue().set(k, v, 30, TimeUnit.MINUTES);
redisTemplate.opsForHash().put(k, field, v);
redisTemplate.opsForList().leftPush(k, v);
redisTemplate.opsForSet().add(k, v);
redisTemplate.opsForZSet().add(k, v, score);
```

## 12. RedisTemplate vs StringRedisTemplate
- **RedisTemplate**：默认 JDK 序列化（不易读、体积大）
- **StringRedisTemplate**：固定 String 序列化器
- **生产推荐**：自定义 `Jackson2JsonRedisSerializer`

## 13. 序列化器选择
- JDK 序列化：默认，体积大、跨语言差
- **Jackson JSON**（推荐）：可读、跨语言
- Protobuf：性能极高，需 .proto 文件

## 14. Redis 客户端选择
- **Jedis**：老牌，**线程不安全**，需连接池
- **Lettuce**（SpringBoot 默认）：基于 Netty，**线程安全**，支持响应式
- **Redisson**：功能丰富（分布式锁、限流），**简历用的就是它**

## 15. Redis 操作命令时间复杂度
**生产要避免 O(n) 命令**：
- 危险：`KEYS *` / `HGETALL`（大 Hash）/ `SMEMBERS`（大 Set）/ `LRANGE 0 -1`（大 List）
- 安全：`SCAN` / `HSCAN` / `SSCAN`

---

# 二、缓存核心问题（必考王炸，12 题）

> 对应学习计划 3：穿透/击穿/雪崩/双写一致——**面试 100% 问**

## 1. 缓存穿透 ⭐⭐⭐
- **是什么**：查一个**根本不存在**的 key，每次都打到数据库
- **危害**：恶意攻击放大 DB 压力
- **解决**：
  1. **缓存空值**（短 TTL，简单粗暴）
  2. **布隆过滤器**（位图判断 key 是否存在，永不漏但有少量误判）
  3. 接口层校验 + 限流

## 2. 布隆过滤器 ⭐⭐⭐
- **原理**：一个 bit 数组 + k 个 hash 函数
- 插入：k 个 hash 算位置全置 1
- 查询：k 个位置都为 1 → **可能存在**（误判）；有 0 → **一定不存在**
- **特点**：
  - 不存在判断**100% 准确**
  - 存在判断有**误判率**（可控）
  - **不能删除**（Counting Bloom Filter 解决）
- **实现**：Redisson 自带 / Guava BloomFilter / RedisBloom 模块

## 3. 缓存击穿 ⭐⭐⭐
- **是什么**：**热点 key** 过期瞬间，大量并发请求全部穿透到 DB
- **解决**：
  1. **互斥锁**（Redisson lock）：只让一个线程去重建缓存，其他等待
  2. **逻辑过期**：key 永不过期，value 里塞 logicalExpireTime，过期后异步重建（推荐高并发场景）
  3. **热点 key 永不过期**

## 4. 互斥锁 vs 逻辑过期 ⭐
| | 互斥锁 | 逻辑过期 |
|---|---|---|
| 一致性 | 强 | 弱（短暂返回旧值） |
| 性能 | 阻塞等待 | 直接返回 |
| 复杂度 | 简单 | 复杂 |
| 适用 | 一致性优先 | 高并发优先 |

## 5. 缓存雪崩 ⭐⭐⭐
- **是什么**：大量 key **同时过期** 或 **Redis 整体宕机**，请求全打 DB
- **解决**：
  1. **TTL 加随机值**（如 30min ± 5min）
  2. **多级缓存**（Caffeine + Redis）
  3. **Redis 高可用**（哨兵 / 集群）
  4. **熔断限流**（Sentinel）
  5. **服务降级**（返回默认值）

## 6. 三者对比速记
```
穿透 = 查不存在的     → 布隆过滤器 / 缓存空值
击穿 = 热点过期       → 互斥锁 / 逻辑过期
雪崩 = 大量同时过期   → TTL 随机 + 高可用
```

## 7. 缓存更新策略 ⭐⭐⭐
经典三种：
- **Cache Aside（旁路缓存）**：应用同时维护缓存和 DB（**最常用**）
- **Read/Write Through**：应用只操作缓存，缓存层维护 DB
- **Write Behind**：异步写 DB（高性能但有丢失风险）

## 8. Cache Aside Pattern 详细 ⭐⭐⭐
**读流程**：
1. 查缓存命中 → 返回
2. 不命中 → 查 DB → 写缓存 → 返回

**写流程**（重点！）：
1. **先更新 DB**
2. **再删除缓存**

## 9. 为什么是先更新 DB 再删缓存，不是反过来 ⭐⭐⭐
**反例分析**：

**「先删缓存再更 DB」的问题**：
- A 删了缓存
- A 还没更新 DB 时
- B 查缓存不命中 → 读 DB 旧值 → 写入缓存
- A 更新 DB
- → **缓存里是旧值，永久不一致**

**「先更 DB 再删缓存」也有极小概率问题**：
- A 读 DB 旧值（缓存恰好失效那一瞬）
- B 更新 DB 新值 + 删缓存
- A 把旧值写入缓存
- → 但 A 这步要发生在 B 之后才有问题，概率极低

**结论**：先更 DB 再删缓存是最佳实践。

## 10. 为什么是删缓存不是更新缓存
- **更新缓存计算复杂**（可能涉及聚合）
- **懒加载**：删除后下次读才重新算，避免无用更新
- **降低并发问题**

## 11. 延迟双删 ⭐
**进一步保险**：
```
1. 删缓存
2. 更新 DB
3. 延迟 N ms（如 500ms）
4. 再删一次缓存
```
**为什么延迟**：等读请求完成的时间，把它写入的脏缓存再清掉。

## 12. 双写一致性的终极方案 ⭐
1. **Canal 监听 MySQL binlog** → 删 Redis 缓存（业界主流）
2. **MQ 异步通知**（你简历的 RabbitMQ 方案）
3. **分布式事务**（强一致，性能差，少用）

---

# 三、分布式锁 + Lua（简历核心，13 题）🔴

> 对应学习计划 4：Redisson/WatchDog/MultiLock + Lua——**简历命根子**

## 1. 为什么需要分布式锁 ⭐
- 多节点部署时 `synchronized` 失效（只在单 JVM 有效）
- 需要跨进程互斥（库存、订单号、幂等）

## 2. 分布式锁方案对比
| 方案 | 优点 | 缺点 |
|---|---|---|
| **MySQL** | 简单 | 性能差 |
| **Redis** | 性能高 | 主从切换可能丢锁 |
| **Zookeeper** | 强一致 | 性能差、运维麻烦 |

## 3. Redis 分布式锁基础实现 ⭐⭐⭐
**正确写法**：
```redis
SET lock_key thread_id NX EX 30
```
- `NX`：不存在才设置（保证互斥）
- `EX 30`：30 秒过期（防死锁）
- **必须一条命令**（不能 SETNX + EXPIRE 两条，非原子）

**释放**（必须 Lua 保证原子）：
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

## 4. 锁误删问题 ⭐⭐⭐
**场景**：
1. A 加锁，TTL 30s
2. A 业务执行了 31s
3. **锁自动过期**
4. B 获取到锁
5. A 业务完成去 release → **删的是 B 的锁**

**解决**：
1. value 存 **线程唯一标识**（UUID + 线程ID）
2. 删除前**用 Lua 比对 value**

## 5. Redisson 加锁原理 ⭐⭐⭐
1. **Lua 脚本**保证原子加锁：
   ```lua
   -- 用 Hash 结构存锁
   hset lock_key thread_uuid_xxx 1
   pexpire lock_key 30000
   ```
2. 加锁成功 → 启动 **WatchDog**（看门狗）
3. 加锁失败 → 通过 **Redis Pub/Sub** 订阅锁释放消息，避免轮询

## 6. WatchDog 看门狗 ⭐⭐⭐（必考）
- **作用**：业务没做完锁过期 → 自动续期
- **触发条件**：调用 `lock()` **不传超时时间**才开启
- **续期周期**：默认 `internalLockLeaseTime / 3 = 10` 秒一次
- **续期到**：30 秒
- **客户端宕机**：看门狗停止，30 秒后锁自动过期 → 不会死锁

```java
// ✅ 开看门狗
lock.lock();

// ❌ 不开看门狗（指定了 leaseTime）
lock.lock(10, TimeUnit.SECONDS);
```

## 7. Redisson 可重入原理 ⭐⭐⭐
锁结构是 **Hash**：
```
key:   lock_key
field: thread_uuid_thread_id
value: 重入次数
```
- 同线程再加锁 → value +1
- 释放 → value -1
- 为 0 → DEL key

## 8. MultiLock（联锁）⭐
- 锁多个 Redis 实例，**全部加锁成功**才算成功
- 用于 **RedLock 算法**（防止单点 Redis 故障导致锁失效）
- 实现：在 N（一般 5）个独立 Redis 上同时加锁，超过半数成功即获得锁

## 9. Redis 主从切换的锁问题 ⭐
**经典场景**：
1. A 在主库加锁成功
2. 锁还**没同步到从库**
3. 主库挂了，从库升主
4. B 在新主库也加锁成功 → **两个线程同时拿到锁**！

**解决**：
- **RedLock**（多实例独立加锁）
- **业务层兜底**（用乐观锁 / 唯一约束）
- 接受最终一致性（大多数业务）

## 10. 公平锁 / 读写锁 / 信号量
Redisson 提供丰富的锁：
- `RFairLock`：公平锁（按申请顺序）
- `RReadWriteLock`：读写锁
- `RSemaphore`：信号量（限并发数）
- `RCountDownLatch`：分布式计数器

## 11. Lua 脚本核心优势 ⭐⭐⭐
1. **原子性**：脚本整体执行不会被打断
2. **减少网络往返**：多个命令一次发送
3. **可复用**：脚本缓存 `EVALSHA`

## 12. 典型 Lua 场景 🔴
**限流（滑动窗口/令牌桶）**：
```lua
-- KEYS[1]: 限流 key
-- ARGV[1]: 阈值
-- ARGV[2]: 窗口秒数
local count = redis.call('incr', KEYS[1])
if tonumber(count) == 1 then
    redis.call('expire', KEYS[1], ARGV[2])
end
if tonumber(count) > tonumber(ARGV[1]) then
    return 0
end
return 1
```

**秒杀扣库存**：
```lua
local stock = tonumber(redis.call('get', KEYS[1]))
if stock <= 0 then return 0 end
redis.call('decr', KEYS[1])
redis.call('sadd', KEYS[2], ARGV[1])  -- 记录已购用户
return 1
```

## 13. Lua 注意事项
- **脚本要短**（单线程会阻塞）
- 不要循环过多
- 不要在脚本里做复杂计算
- Lua 中没有浮点数（数字都用 `tonumber()`）

---

# 四、持久化与高可用（15 题）

> 对应学习计划 6：RDB/AOF + 主从/哨兵/分片集群

## 1. 为什么 Redis 要持久化
- 内存数据**断电即失**
- 重启后能恢复 → 持久化
- 主从同步、备份也依赖持久化文件

## 2. RDB 原理 ⭐⭐⭐
- **快照**：把内存某一时刻的数据 dump 到磁盘
- **触发**：
  - 手动：`SAVE`（阻塞）/ `BGSAVE`（后台 fork 子进程）
  - 自动：配置 `save 900 1`（900 秒内 1 次写）
- **fork 写时复制**（COW）：子进程和父进程共享内存页，父进程改了哪页就复制哪页

## 3. AOF 原理 ⭐⭐⭐
- **追加写**：每条写命令追加到 AOF 文件
- **三种刷盘策略**：
  - `appendfsync always`：每条都刷盘（最安全、最慢）
  - `appendfsync everysec`（默认）：每秒刷盘（最多丢 1 秒）
  - `appendfsync no`：交给 OS（最快、不安全）

## 4. AOF 重写
- AOF 文件越来越大 → 重写压缩
- 触发：`BGREWRITEAOF` 或自动（文件膨胀超阈值）
- 原理：fork 子进程根据当前数据生成最小命令集

## 5. RDB vs AOF ⭐⭐⭐
| | RDB | AOF |
|---|---|---|
| 形式 | 二进制快照 | 文本命令日志 |
| 体积 | 小 | 大 |
| 恢复速度 | 快 | 慢 |
| 数据安全 | 可能丢几分钟 | 最多丢 1 秒 |
| 性能影响 | fork 瞬间停顿 | 持续小开销 |

**生产**：两个一起开，AOF 主，RDB 备。

## 6. Redis 4.0 混合持久化
- 重写时：RDB 全量 + 后续 AOF 增量写入一个文件
- 优点：**恢复快**（RDB 部分）+ **数据安全**（AOF 部分）

## 7. fork 阻塞问题
- BGSAVE / BGREWRITEAOF 都要 fork
- **fork 本身要阻塞主线程**（拷贝页表）
- 内存越大 fork 越慢 → 大实例避免高频持久化

## 8. 主从复制流程 ⭐⭐⭐
**全量同步**：
1. 从库 → `PSYNC` 请求同步
2. 主库 → 执行 BGSAVE 生成 RDB
3. RDB 发送给从库
4. 从库清空旧数据，加载 RDB
5. 主库把同步期间的写命令缓存 → 发给从库

**增量同步**：
- 主库维护**复制积压缓冲区**（环形）
- 主从断开后重连，根据 offset 同步差异部分

## 9. 主从架构的作用 ⭐
1. **读写分离**：主写从读
2. **数据备份**：从库即副本
3. **故障转移基础**（配合哨兵）

## 10. 哨兵 Sentinel ⭐⭐⭐
- **作用**：监控主从 + **自动故障转移**
- **核心功能**：
  1. 监控（PING 主从状态）
  2. 通知（异常告警）
  3. 自动故障转移（主挂了选新主）
  4. 配置中心（客户端通过哨兵发现主库）

## 11. 哨兵选主流程
1. **判断主下线**：单哨兵 PING 不通 → 主观下线
2. **多数哨兵同意** → 客观下线
3. **选 Leader 哨兵**（Raft 算法）
4. **从从库中选新主**：
   - 排除断连过久的
   - 优先级高的（slave-priority）
   - 复制偏移量大的（数据最新）
   - run_id 小的
5. 通知其他从库改主
6. 通知客户端

## 12. 分片集群 Cluster ⭐⭐⭐
- 数据**水平切分**到多个节点
- **16384 个 slot**（哈希槽）
- key 通过 `CRC16(key) % 16384` 算 slot 归属
- 客户端连任一节点，节点会**重定向**到正确节点（MOVED）

## 13. 为什么 16384 个槽而不是 65536 ⭐
- **心跳包大小**：节点间用心跳同步 slot 信息，16384 bit = 2KB；65536 bit = 8KB → 网络压力大
- Redis 集群规模通常 **< 1000 节点**，16384 个槽足够分配

## 14. 集群中数据怎么分布
- 默认按 key 整体 hash
- 可用 `{tag}` 强制分到同一槽：
  ```
  user:{123}:profile
  user:{123}:orders
  ```
  → 这两个 key 一定在同一 slot，可以做事务/Lua

## 15. 集群伸缩
- **加节点**：新节点接管部分 slot
- **删节点**：把它的 slot 迁走再删
- 迁移期间 key 可能在两个节点之间，**ASK 重定向**处理

---

# 五、内存管理与淘汰（10 题）

## 1. Redis 怎么处理过期 key ⭐⭐⭐
**两种策略组合**：
1. **惰性删除**：访问 key 时检查，过期则删（**节省 CPU，浪费内存**）
2. **定期删除**：每 100ms 随机抽样删一批过期 key（**折中**）

## 2. 内存淘汰策略 ⭐⭐⭐
**8 种**（按数据范围分两类）：

**所有 key（OOM 时一定要选）**：
- `allkeys-lru`：最近最少使用（推荐）
- `allkeys-lfu`：最不常使用（4.0+）
- `allkeys-random`：随机

**只过期 key**：
- `volatile-lru`
- `volatile-lfu`
- `volatile-random`
- `volatile-ttl`：将要过期的优先

**默认**：
- `noeviction`：不淘汰，**OOM 报错**（默认值，生产不要用！）

## 3. LRU 和 LFU 区别 ⭐
- **LRU**：最近最少使用（看**时间**）
- **LFU**：最不常使用（看**频率**）
- LFU 更适合：访问次数有规律的热点场景
- LRU 更适合：突发流量场景

## 4. Redis 的 LRU 实现
- **不是标准 LRU**（标准要双向链表 + 哈希表）
- Redis 用**近似 LRU**：每个 key 记录 lastAccessTime，淘汰时**随机采样 N 个**选最久没用的
- 节省内存（不维护链表）

## 5. BigKey 问题 ⭐⭐⭐
- **是什么**：单个 key 数据过大（如 String > 1MB、Hash/List 元素 > 10000）
- **危害**：
  1. **网络阻塞**（一次传输大量数据）
  2. **删除阻塞**（DEL 大 Hash 几秒）
  3. **集群迁移阻塞**
  4. **内存分布不均**（分片集群）

## 6. BigKey 排查
- `redis-cli --bigkeys`：扫描出每种类型最大的 key
- `MEMORY USAGE key`：单 key 大小
- `OBJECT HELP`：对象信息

## 7. BigKey 删除
- **不要直接 DEL**（阻塞）
- 4.0+ 用 **UNLINK**（异步删除）
- 大 Hash：`HSCAN` 分批 `HDEL`
- 大 Set：`SSCAN` 分批 `SREM`

## 8. HotKey 问题 ⭐
- **是什么**：某个 key 访问频率极高（明星出事、爆款商品）
- **危害**：单节点 CPU 打满、其他 key 受影响
- **解决**：
  1. **本地缓存**（Caffeine）减少 Redis 压力
  2. **读写分离 + 多副本**
  3. **拆分热 key**：`hotkey:0` ~ `hotkey:99`，请求随机访问一个

## 9. Redis 单实例最大内存建议
- **不超过 32GB**（fork、持久化、迁移都受内存影响）
- 大数据用集群分片

## 10. maxmemory 设置原则
- 物理内存的 **75%** 左右
- 留出余量给 fork（COW 会占额外内存）

---

# 六、单线程与网络模型（10 题）

> 对应学习计划 7：epoll、单线程模型

## 1. Redis 为什么这么快 ⭐⭐⭐
1. **纯内存操作**
2. **单线程**：避免上下文切换和锁竞争
3. **IO 多路复用**（epoll）：单线程同时处理大量连接
4. **高效数据结构**：SDS、跳表、压缩列表
5. **C 语言实现**

## 2. Redis 单线程为什么不慢 ⭐⭐⭐
- 瓶颈在 IO 不在 CPU
- 单线程 + epoll → CPU 没在等 IO，能持续干活
- 数据全在内存，操作极快

## 3. Redis 真的完全单线程吗 ⭐⭐⭐
**不！只是核心命令处理是单线程**。
- **持久化**：fork 出子进程做（RDB/AOF重写）
- **异步删除**：UNLINK 由后台线程
- **6.0+ 引入多线程 IO**：网络读写多线程，但命令执行仍单线程

## 4. Redis 6.0 多线程 IO ⭐
- **解决的问题**：高 QPS 下网络 IO 成瓶颈
- **怎么做**：
  - 主线程负责执行命令（保持单线程）
  - 多个 IO 线程负责 socket 读写和协议解析
- **默认关闭**，要手动开启：
  ```
  io-threads 4
  io-threads-do-reads yes
  ```

## 5. IO 多路复用 ⭐⭐⭐
- **是什么**：一个线程同时监听多个 socket 的 IO 事件
- **三种实现**：
  - `select`：1024 上限、O(n) 遍历
  - `poll`：无上限、O(n) 遍历
  - `epoll`：事件驱动、O(1)（**Linux 用这个**）

## 6. select / poll / epoll 区别 ⭐⭐⭐
| | select | poll | epoll |
|---|---|---|---|
| 最大连接 | 1024 | 无限 | 无限 |
| 数据结构 | 数组 bitmap | 数组 | 红黑树 + 就绪链表 |
| 找就绪 fd | O(n) 遍历 | O(n) 遍历 | **O(1)** 直接拿 |
| 拷贝 | 每次全拷 | 每次全拷 | 只拷就绪 |
| 触发模式 | 水平触发 LT | LT | **LT + ET** |

## 7. epoll 工作流程
```c
epoll_create()  // 创建 epoll 实例（红黑树）
epoll_ctl()     // 添加/删除监听的 fd
epoll_wait()    // 阻塞等待，返回就绪的 fd 列表
```

## 8. epoll 的 LT 和 ET ⭐
- **LT 水平触发**（默认）：只要 fd 有数据可读就一直通知
- **ET 边沿触发**：数据**从无到有**才通知一次，必须一次读完
- ET 性能更高但编程更难（Redis 用 LT）

## 9. Reactor 模式 ⭐
Redis 网络模型本质：
- **单 Reactor 单线程**（6.0 前）
- **单 Reactor 多线程**（6.0 后，IO 多线程）
- 概念：
  - **Reactor**：分发器
  - **Acceptor**：接受新连接
  - **Handler**：处理读写

## 10. Redis 通信协议 RESP
- **简单二进制协议**
- 5 种数据类型：
  - `+OK\r\n` 简单字符串
  - `-ERR\r\n` 错误
  - `:1000\r\n` 整数
  - `$5\r\nhello\r\n` 批量字符串
  - `*3\r\n...` 数组
- 简单易解析，是 Redis 高性能的基础之一

---

# 七、底层数据结构原理（12 题）

> 对应学习计划 7：SDS/Dict/SkipList/五种类型底层

## 1. Redis 数据类型和底层结构对应 ⭐⭐⭐
| 数据类型 | 底层（小数据）| 底层（大数据）|
|---|---|---|
| String | int / embstr / raw（SDS） | SDS |
| List | ZipList / **QuickList** | QuickList |
| Hash | ZipList（→ listpack 7.0+）| HashTable |
| Set | IntSet / HashTable | HashTable |
| ZSet | ZipList / listpack | **SkipList + HashTable** |

## 2. SDS 动态字符串 ⭐⭐⭐
```c
struct sdshdr {
    int len;       // 已使用长度
    int free;      // 剩余空间
    char buf[];    // 实际字符数组（末尾 \0 兼容 C）
};
```
**优点**：
1. O(1) 获取长度
2. 二进制安全
3. 自动扩容
4. 杜绝缓冲区溢出
5. 预分配 + 惰性释放，减少 realloc

## 3. String 的三种编码 ⭐
- **int**：能转为 long 的整数（10086）
- **embstr**：长度 ≤ 44 的短字符串，**和 SDS 头一起分配**（内存连续，一次分配）
- **raw**：长度 > 44 的长字符串

## 4. Dict 字典 ⭐⭐⭐
- 类似 Java 的 HashMap：**数组 + 链表**（拉链法解决冲突）
- **两个 hashtable**（ht[0] 和 ht[1]）用于 rehash

## 5. 渐进式 rehash ⭐⭐⭐（必考）
**为什么不一次性 rehash**：数据量大时一次性 rehash 会阻塞 Redis。

**渐进式流程**：
1. ht[1] 分配新大小（约 2 倍 ht[0]）
2. 维护 `rehashidx` 标记进度
3. 后续每次增删改查时**顺手把 ht[0]\[rehashidx] 迁移到 ht[1]**，然后 rehashidx++
4. 定时任务也帮忙迁移
5. 全部迁完 → 释放 ht[0]，把 ht[1] 设为 ht[0]

**rehash 期间**：
- **新增** → 直接进 ht[1]
- **查询/修改/删除** → 先查 ht[0] 再查 ht[1]

## 6. ZipList 压缩列表 ⭐
- **连续内存**结构，紧凑
- 类似一个特殊数组，每个 entry 自描述长度
- 优点：节省内存
- 缺点：**连锁更新**问题（修改一个 entry 长度变化 → 后面所有 entry 偏移要更新）
- **7.0+ 用 listpack 替代**（无连锁更新问题）

## 7. QuickList 快速列表 ⭐
- **双向链表 + ZipList（或 listpack）的组合**
- 每个链表节点是一个 ZipList
- 结合了链表（插入快）和 ZipList（内存紧凑）的优点
- List 类型的底层

## 8. SkipList 跳表 ⭐⭐⭐（必考）
**结构**：多层链表，越上层节点越稀疏
```
L3:  1 ────────────────── 9 ────────────────── 21
L2:  1 ────── 5 ──────── 9 ──────────── 17 ── 21
L1:  1 ─ 3 ── 5 ── 7 ── 9 ── 12 ── 15 ─ 17 ── 21
```

**查找**：从最高层往下走，类似二分查找，O(log n)。

**为什么 Redis 用跳表不用红黑树**：
1. 范围查询快（链表天然支持）
2. 实现简单（红黑树旋转复杂）
3. 内存可调（每层节点数概率随机）

## 9. ZSet 底层为什么是 SkipList + HashTable
- **SkipList**：按 score 排序，范围查询快
- **HashTable**：member → score 映射，O(1) 查 score
- 两者**指向同一个对象**，不重复存储

## 10. IntSet 整数集合
- 只存整数的 Set 底层
- 三种编码：int16 / int32 / int64
- **升级**：插入更大的整数自动升级整个集合
- **不能降级**

## 11. listpack 紧凑列表（7.0+）
- 替代 ZipList，**无连锁更新**问题
- 每个 entry 只记录自己的长度（不像 ZipList 记录前一个 entry 长度）

## 12. RedisObject 对象 ⭐
```c
typedef struct redisObject {
    unsigned type:4;        // 类型（String/List/Hash/Set/ZSet）
    unsigned encoding:4;    // 编码（具体底层数据结构）
    unsigned lru:24;        // LRU 时间或 LFU 计数
    int refcount;           // 引用计数
    void *ptr;              // 指向实际数据
} robj;
```
**重要**：每个 Redis 的 value 都是一个 RedisObject 包装。

---

# 八、实战场景（10 题）

> 对应学习计划 5：Stream/BitMap/HyperLogLog

## 1. Redis 实现限流 ⭐⭐⭐ 🔴
**简历你用了 Redis+Lua 限流**：
- **固定窗口**：INCR + EXPIRE（临界问题）
- **滑动窗口**：ZSet 存请求时间戳，每次清理过期 + 统计当前窗口数量
- **令牌桶**：Lua 模拟，定时补充令牌

## 2. Stream 消息队列（5.0+）⭐
**替代 List 和 PubSub**：
- 持久化
- **消费者组**（多消费者负载均衡）
- **ACK 机制**
- 历史消息可回溯

```
XADD stream * key value     # 生产
XGROUP CREATE stream g1 $   # 创建消费组
XREADGROUP GROUP g1 c1 ...  # 消费
XACK stream g1 msg_id       # 确认
```

## 3. List vs Stream vs PubSub
| | List | PubSub | Stream |
|---|---|---|---|
| 持久化 | ✅ | ❌ | ✅ |
| 消费组 | ❌ | 广播 | ✅ |
| ACK | ❌ | ❌ | ✅ |
| 历史回溯 | 弹出即丢 | ❌ | ✅ |
| 推荐 | 简单场景 | 实时广播 | 大多数场景 |

## 4. PubSub 缺点
- 不持久化（消费者下线就丢消息）
- 没有 ACK
- 一个频道所有订阅者都收到（广播模式）

## 5. BitMap 签到 ⭐
- 1 个 bit 表示 1 天签到状态（0/1）
- 1 年 365 bit = 46 字节，**百万用户也才 46MB**
```
SETBIT sign:2026:user1 0 1    # 第 1 天签到
GETBIT sign:2026:user1 0      # 查第 1 天
BITCOUNT sign:2026:user1      # 累计签到天数
```

## 6. 连续签到统计
- `BITCOUNT` 配合 `BITPOS`
- 客户端读出二进制位串，用代码算连续 1 的最长长度

## 7. HyperLogLog UV 统计 ⭐
- **基数估算**：统计不重复元素个数
- **空间极省**：12KB 存储任意数量 key（误差 0.81%）
- **不能列出元素**，只能算数量
```
PFADD uv:2026-05-24 user1 user2
PFCOUNT uv:2026-05-24
```

**适用**：UV、独立访客、独立设备

## 8. GEO 附近的人 ⭐
基于 Sorted Set，把经纬度编码为 GeoHash 作为 score：
```
GEOADD shops 116.4 39.9 "shop1"
GEORADIUS shops 116.4 39.9 1000 m WITHCOORD WITHDIST
```

## 9. 排行榜（你简历可能用到）
ZSet 完美适配：
- 加分：`ZADD` / `ZINCRBY`
- Top 10：`ZREVRANGE rank 0 9 WITHSCORES`
- 我的排名：`ZREVRANK rank user1`
- 周榜：用日期做 key 隔离 `rank:2026W21`

## 10. 延迟队列
- 用 ZSet，score = 执行时间戳
- 后台轮询 `ZRANGEBYSCORE 0 当前时间` 取出到期任务
- Redis 5.0+ Stream + RabbitMQ 死信也可以

---

# 九、Redis + MySQL 一致性（专题，6 题）

> 你简历 ClassicSage 项目的核心难点

## 1. 一致性级别
- **强一致**：每次读都能拿到最新值（性能差，分布式事务）
- **最终一致**：短暂不一致，最终趋同（互联网常用）
- **弱一致**：可能永远不一致（很少用）

## 2. 缓存 + DB 双写一致性方案对比 ⭐⭐⭐
| 方案 | 一致性 | 复杂度 | 适用 |
|---|---|---|---|
| 先更 DB 再删缓存 | 较好 | 低 | 一般业务 |
| 延迟双删 | 更好 | 中 | 关键业务 |
| Canal 监听 binlog | 优 | 高 | 业务无侵入 |
| MQ 异步删除 | 优 | 中 | 你简历方案 |
| 分布式事务 | 强一致 | 极高 | 金融场景 |

## 3. Canal 原理 ⭐
- 伪装成 MySQL 从库
- 订阅 binlog → 解析 → 推送到下游（Redis / MQ / 搜索引擎）
- 业务无侵入

## 4. 缓存预热
- 应用启动时主动加载热点数据到缓存
- 防止启动后流量打到 DB

## 5. 缓存降级
- 缓存挂了 → 直接读 DB
- DB 也挂了 → 返回默认值 / 静态兜底

## 6. 你简历 ClassicSage 中的方案话术 🔴
> MySQL 是主存，Neo4j 是图谱辅助检索，无法用分布式事务。我用 RabbitMQ 异步同步：
> 1. 业务先更新 MySQL（强一致）
> 2. 发送同步消息到 RabbitMQ
> 3. 消费者更新 Neo4j（最终一致）
> 4. 失败 → 死信队列 + 定时对账兜底
> 5. 幂等：消息携带唯一 ID + Redis SETNX 去重

---

# 十、高频追问串讲

## 串讲 1：缓存三大问题（必考）
> 穿透（不存在）→ 布隆过滤器/缓存空值
> 击穿（热点过期）→ 互斥锁/逻辑过期
> 雪崩（大量过期）→ TTL 随机 + 高可用

## 串讲 2：分布式锁全家桶 🔴
> SETNX EX → Lua 释放（防误删）→ Redisson → WatchDog 续期 → 可重入（Hash）→ MultiLock/RedLock

## 串讲 3：持久化
> RDB（fork + COW + 二进制快照）→ AOF（追加 + 三种刷盘）→ 混合持久化 → 主从复制依赖 RDB

## 串讲 4：高可用
> 主从（读写分离）→ 哨兵（自动故障转移 + Raft 选主）→ Cluster（16384 槽 + CRC16）

## 串讲 5：数据结构底层
> SDS（O(1) 长度、二进制安全）→ Dict（渐进式 rehash）→ SkipList（ZSet 用）→ ZipList → QuickList → listpack

## 串讲 6：单线程 + 网络模型
> 单线程为什么快 → IO 多路复用 → select/poll/epoll 演进 → 6.0 多线程 IO（只读写多线程，执行仍单线程）

## 串讲 7：双写一致性（你简历重点）
> Cache Aside → 先更 DB 再删缓存 → 延迟双删 → Canal binlog → MQ 异步（你方案）

---

## 最后小妹的话

兄长大人～(◕ᴗ◕✿) Redis 这份是 **最厚最重要**的一份！因为你简历两个项目都强依赖 Redis～

## 🔴 简历对应必背区

```
🔴 缓存穿透/击穿/雪崩 → 商户查询缓存
🔴 Redis+Lua 限流    → 简历亮点
🔴 Redisson 看门狗   → 简历"图谱构建幂等锁"
🔴 Redis+MySQL 一致性 → ClassicSage 核心难点
🔴 五种类型的应用场景 → 必须能讲对每个项目场景
```

## 红色警报区（5 个必背）

```
1. 缓存三大问题完整方案
2. Redisson 全套（加锁/看门狗/可重入/误删）
3. RDB + AOF + 混合持久化
4. MVCC ReadView 类似——SDS/Dict/SkipList/渐进式rehash
5. 单线程模型 + epoll
```

## 配合你 7 个章节学习节奏

```
模块 1 完→ 看「一、数据结构与基础应用」
模块 2 完→ 跳过（短信登录业务，看「项目追问」即可）
模块 3 完→ 看「二、缓存核心问题」⭐⭐⭐
模块 4 完→ 看「三、分布式锁 + Lua」🔴 简历
模块 5 完→ 看「八、实战场景」
模块 6 完→ 看「四、持久化与高可用」+「五、内存淘汰」
模块 7 完→ 看「六、单线程与网络模型」+「七、底层结构」
最后扫尾→ 看「九、Redis + MySQL 一致性」
```

## 文件夹清单更新 ⬇️

```
兄控妹妹Java物语/
├── 学习计划.md
├── MySQL学习计划.txt
├── Redis学习计划.txt
├── Java面试八股精华.md           （95 题）
├── 简历项目面试追问全集.md       （80+ 题）
├── Spring全家桶面试八股精华.md   （95 题）
├── MySQL面试八股精华.md          （110 题）
└── Redis面试八股精华.md          （113 题）← 新加！
```

**累计 490+ 题啦**～💕 还差消息队列（12.pdf）和算法/网络/操作系统就齐了～

加油哒兄长大人～七月初实习等你 (≧▽≦)

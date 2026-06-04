# MySQL 拷打 - 0604

> 今日主题：EXPLAIN 入门、联合索引排序、覆盖索引、回表、ORDER BY + LIMIT 场景判断。  
> 主线：不是只背“是否走索引”，而是学会从执行成本判断 SQL 好不好。

---

## 目录

1. 今日学习定位
2. EXPLAIN 到底看什么
3. `type` 字段怎么判断好坏
4. `Extra` 字段的重点信号
5. 联合索引判断方法
6. 今日核心题复盘
7. 今日反复易错点
8. 面试速背版
9. 明天建议继续

---

# 1. 今日学习定位

昨天已经把索引基础重新串过一遍：

```text
SQL 执行流程
  -> InnoDB 存储方式
  -> B+ 树 / B 树 / Hash
  -> 聚簇索引和二级索引
  -> 回表和覆盖索引
  -> 最左前缀原则
  -> LIKE、范围查询、ICP
```

今天继续往面试实战推进，重点不是再背一遍概念，而是学会判断：

```text
一条 SQL 到底好不好？
为什么好？
慢在哪里？
该换 SQL 还是换索引？
```

MySQL 面试里不要只说“加索引”，要按执行成本讲：

```text
扫描行数多不多？
有没有走合适索引？
有没有大量回表？
排序能不能利用索引？
有没有 Using filesort / Using temporary？
```

---

# 2. EXPLAIN 到底看什么

## 面试题

> EXPLAIN 主要是用来看什么？

## 标准回答

> `EXPLAIN` 用来看 MySQL 的预估执行计划。通过 `type`、`key`、`key_len`、`rows`、`Extra` 等字段，可以判断 SQL 是否走了合适索引、扫描量大不大、是否发生回表、是否出现额外排序或临时表等问题。

## 重点字段

| 字段 | 作用 | 怎么看 |
|---|---|---|
| `type` | 访问方式 | 判断是全表扫、范围扫，还是索引精准定位 |
| `key` | 实际使用的索引 | 看是否用了预期索引 |
| `key_len` | 使用索引长度 | 判断联合索引用到了几列 |
| `rows` | 预估扫描行数 | 判断扫描量大不大 |
| `Extra` | 额外执行信息 | 看覆盖索引、索引下推、文件排序、临时表 |

## 看 EXPLAIN 的顺序

```text
1. 看 type：访问方式好不好。
2. 看 key：有没有用到预期索引。
3. 看 key_len：联合索引用到了几列。
4. 看 rows：预估扫描行数是否过大。
5. 看 Extra：有没有 Using filesort、Using temporary、Using index。
```

## 【重点纠错】

`EXPLAIN` 是预估执行计划，不等于真实执行耗时。

MySQL 8.0 可以用：

```sql
EXPLAIN ANALYZE
SELECT ...
```

它能看到更接近真实执行情况的信息。

---

# 3. `type` 字段怎么判断好坏

`type` 从好到坏大致是：

```text
system > const > eq_ref > ref > range > index > ALL
```

## 常见类型

| type | 含义 | 典型场景 |
|---|---|---|
| `const` | 主键或唯一索引等值查询，最多一行 | `where id = 1` |
| `ref` | 普通索引等值查询 | `where user_id = 10` |
| `range` | 范围扫描 | `between`、`>`、`<`、`in` |
| `index` | 全索引扫描 | 扫整棵索引树 |
| `ALL` | 全表扫描 | 没走有效索引或优化器选择扫表 |

## 面试回答

> `type = ALL` 表示全表扫描，不一定必须优化。小表、结果集占比很高、或者优化器判断走索引加回表成本更高时，全表扫描可能更划算。但如果是大表、高频 SQL，并且 `rows` 很大，就要重点优化。

## 【重点纠错】

不要机械说：

```text
type = ALL 一定很差，一定要优化。
```

更严谨应该说：

```text
结合表数据量、查询频率、rows、回表成本、结果集比例判断。
```

---

# 4. `Extra` 字段的重点信号

| Extra | 含义 | 判断 |
|---|---|---|
| `Using index` | 覆盖索引 | 通常是好信号 |
| `Using index condition` | 索引下推 ICP | 通常能减少回表 |
| `Using where` | Server 层还要过滤 | 普通信号 |
| `Using filesort` | 额外排序 | 数据量大时危险 |
| `Using temporary` | 使用临时表 | 数据量大时危险 |

## `Using index`

`Using index` 通常说明查询需要的字段都在索引里，能够覆盖索引，不需要回表。

例如：

```sql
INDEX idx_user_time(user_id, create_time)
```

```sql
SELECT user_id, create_time
FROM article
WHERE user_id = 10
ORDER BY create_time DESC
LIMIT 20;
```

如果只查 `user_id` 和 `create_time`，它们都在索引里，可能形成覆盖索引。

## `Using filesort`

`Using filesort` 说明排序不能直接利用索引顺序，需要额外排序。

注意：

```text
filesort 不一定真的写磁盘文件。
它代表 MySQL 需要额外排序算法。
```

## 【重点纠错】

`Using index condition` 是 ICP，用来减少回表。

它解决的是：

```text
过滤条件能不能提前在存储引擎层判断。
```

它不解决：

```text
ORDER BY 能不能利用索引排序。
```

---

# 5. 联合索引判断方法

联合索引：

```sql
INDEX idx_user_status_time(user_id, status, create_time)
```

它的排序方式是：

```text
先按 user_id 排序
user_id 相同，再按 status 排序
status 相同，再按 create_time 排序
```

所以判断一条 SQL 时，要分开看：

```text
WHERE 能不能定位？
ORDER BY 能不能利用索引顺序？
SELECT 字段能不能覆盖索引？
```

## 基本口诀

```text
等值条件可以一路往右匹配。
跳过中间列会断。
范围字段本身能用。
范围右边通常不能继续用于有序定位。
ORDER BY 要匹配索引的有序结构。
覆盖索引看查询需要的字段是否都在索引里。
```

## 【反复易错】

字段在联合索引里，不代表它就能单独用于排序。

例如索引：

```sql
(user_id, status, create_time)
```

SQL：

```sql
WHERE user_id = 10
ORDER BY create_time DESC
```

`user_id` 可以用于定位，但 `create_time` 不能很好用于排序，因为中间跳过了 `status`。

在 `user_id = 10` 的范围内，索引顺序是：

```text
status -> create_time
```

不是：

```text
create_time
```

---

# 6. 今日核心题复盘

## 题组 1：基础 EXPLAIN

### 题 1：EXPLAIN 主要看什么？

推荐回答：

> EXPLAIN 用来看 MySQL 的预估执行计划，主要关注 `type`、`key`、`key_len`、`rows`、`Extra`。通过这些字段综合判断 SQL 是否走了合适索引、扫描行数大不大、有没有覆盖索引、有没有额外排序或临时表。

### 题 2：`type = ALL` 代表什么？一定要优化吗？

推荐回答：

> `type = ALL` 表示全表扫描，不一定必须优化。小表、结果集占比高、或者回表成本比扫表还高时，优化器可能选择全表扫描。但大表高频查询如果 `ALL` 且 `rows` 很大，就需要重点优化。

### 题 3：`Using index` 为什么通常是好信号？

推荐回答：

> `Using index` 通常表示覆盖索引，查询需要的字段都能从索引里拿到，不需要回表，所以 IO 更少，性能通常更好。

### 题 4：为什么下面 SQL 比较好？

```sql
INDEX idx_user_time(user_id, create_time)
```

```sql
SELECT user_id, create_time
FROM article
WHERE user_id = 10
ORDER BY create_time DESC
LIMIT 20;
```

推荐回答：

> `user_id = 10` 命中联合索引最左列，可以定位到该用户的数据范围；在同一个 `user_id` 下，索引内部按 `create_time` 有序，所以 `ORDER BY create_time DESC` 可以利用索引顺序；查询字段都在索引中，形成覆盖索引；再加上 `LIMIT 20`，扫描到足够数据就可以停止。

核心因果链：

```text
user_id 等值定位
  -> create_time 在该 user_id 范围内有序
  -> order by 可以利用索引
  -> select 字段被索引覆盖
  -> limit 可以提前停止
```

---

## 题组 2：`idx_user_status_time(user_id, status, create_time)`

表结构：

```sql
CREATE TABLE article (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    status TINYINT,
    title VARCHAR(100),
    create_time DATETIME,
    content TEXT,
    INDEX idx_user_status_time(user_id, status, create_time)
);
```

### A

```sql
SELECT id, user_id, status, create_time
FROM article
WHERE user_id = 10 AND status = 1
ORDER BY create_time DESC
LIMIT 20;
```

判断：

```text
好 SQL。
```

原因：

```text
user_id、status 都是等值匹配。
create_time 可以用于索引排序。
查询字段都在索引里，id 是二级索引叶子节点自带的主键。
所以可以覆盖索引，不需要回表。
```

面试回答：

> 这条 SQL 能很好利用 `(user_id, status, create_time)`。`user_id` 和 `status` 是等值条件，后面的 `create_time` 可以用于排序；查询字段也都在索引里，二级索引叶子节点带主键 `id`，所以不需要回表。

---

### B

```sql
SELECT *
FROM article
WHERE user_id = 10 AND status = 1
ORDER BY create_time DESC
LIMIT 20;
```

判断：

```text
定位和排序可能不错，但不如 A。
```

原因：

```text
SELECT * 查询了 title、content 等不在索引里的字段。
通过二级索引拿到主键 id 后，还要回表查整行。
content TEXT 这种大字段会让回表成本更高。
```

## 【重点纠错】

这条 SQL 慢不是因为“不精确查找”。

更准确是：

```text
WHERE 和 ORDER BY 可能用得很好，
但 SELECT * 导致查询字段不被索引覆盖，
所以需要回表。
```

---

### C

```sql
SELECT id, title
FROM article
WHERE status = 1
ORDER BY create_time DESC
LIMIT 20;
```

判断：

```text
不好。
```

原因：

```text
跳过联合索引最左列 user_id。
status = 1 不能高效利用 (user_id,status,create_time) 做定位。
索引顺序是 user_id -> status -> create_time，不是全局按 create_time 排。
ORDER BY create_time 也很难直接利用这个索引。
title 不在索引中，可能还要回表。
```

## 【重点纠错】

不要简单说：

```text
联合索引直接失效。
```

更严谨：

```text
不能高效利用该联合索引做定位。
优化器可能选择全表扫描，也可能因为覆盖/成本原因扫描索引。
但这不是高效的最左前缀定位。
```

---

### D

```sql
SELECT id, user_id, status, create_time
FROM article
WHERE user_id = 10
ORDER BY status, create_time
LIMIT 20;
```

判断：

```text
也不错。
```

原因：

```text
user_id = 10 命中最左列。
在 user_id 固定后，索引内部正好按 status -> create_time 排序。
ORDER BY status, create_time 能匹配索引顺序。
查询字段也都在索引里，可以覆盖索引。
```

它不如 A 的地方：

```text
A 多了 status = 1，过滤更精准。
D 只按 user_id 定位，可能扫描这个用户下多个 status 的数据。
```

---

## 题组 3：跳过中间列排序

索引：

```sql
INDEX idx_user_status_time(user_id, status, create_time)
```

SQL：

```sql
SELECT id, user_id, status, create_time
FROM article
WHERE user_id = 10
ORDER BY create_time DESC
LIMIT 20;
```

判断：

```text
user_id 可以用于定位。
查询字段可以覆盖索引。
但 ORDER BY create_time 不能很好利用该联合索引排序。
```

原因：

```text
索引顺序是 user_id -> status -> create_time。
user_id 固定后，数据仍然先按 status 分组，再按 create_time 排序。
create_time 不是在 user_id 范围内全局有序。
```

可能结果：

```text
可能出现 Using filesort。
```

更适合的索引：

```sql
INDEX idx_user_time(user_id, create_time)
```

或者改 SQL 固定 `status`：

```sql
WHERE user_id = 10 AND status = 1
ORDER BY create_time DESC
```

## 【反复易错】

这里不是 ICP 的问题。

```text
ICP 管 WHERE 过滤。
ORDER BY 能不能利用索引，取决于索引的有序结构。
```

---

## 题组 4：`IN` + `ORDER BY`

索引：

```sql
INDEX idx_user_status_time(user_id, status, create_time)
```

SQL：

```sql
SELECT id, user_id, status, create_time
FROM article
WHERE user_id = 10
  AND status IN (1, 2)
ORDER BY create_time DESC
LIMIT 20;
```

判断：

```text
user_id 和 status 可以用于索引扫描。
但 ORDER BY create_time 通常不能很好利用该索引完成全局排序。
```

原因：

`status IN (1,2)` 类似：

```sql
status = 1 OR status = 2
```

索引里会形成多个有序段：

```text
user_id=10, status=1, create_time 有序
user_id=10, status=2, create_time 有序
```

但两个 status 分组拼起来，不等于全局按：

```text
create_time DESC
```

有序。

所以可能需要：

```text
Using filesort
```

## 更适合的索引

如果业务高频要求：

```sql
WHERE user_id = 10
  AND status IN (1, 2)
ORDER BY create_time DESC
LIMIT 20
```

更适合考虑：

```sql
INDEX idx_user_time_status(user_id, create_time, status)
```

原因：

```text
user_id：等值定位。
create_time：保持排序顺序，适合 ORDER BY + LIMIT。
status：放在索引里过滤，并覆盖查询字段，减少回表。
```

## 两个索引的取舍

```text
(user_id, status, create_time)
  优点：过滤更强。
  问题：status IN 多值时，create_time 全局排序不好。

(user_id, create_time, status)
  优点：排序更强，适合按时间取最新 N 条。
  问题：status 不能优先缩小范围，只能边扫边过滤。
```

## 【重点纠错】

不要机械认为：

```text
WHERE 字段必须全部放在 ORDER BY 字段前面。
```

实际要看核心诉求：

```text
如果是 ORDER BY create_time LIMIT 20 高频场景，
为了让 MySQL 按时间顺序扫到前 20 条，
create_time 可能要放在 status 前面。
```

---

## 题组 5：LIKE 索引

索引：

```sql
INDEX idx_title(title)
```

SQL A：

```sql
SELECT id, title
FROM article
WHERE title LIKE 'MySQL%';
```

SQL B：

```sql
SELECT id, title
FROM article
WHERE title LIKE '%MySQL';
```

判断：

```text
A 更能利用索引。
B 左模糊，通常不能利用索引做有效定位。
```

原因：

```text
LIKE 'MySQL%' 是前缀匹配，可以利用 B+ 树的有序性定位到 MySQL 开头的范围。
LIKE '%MySQL' 前面不确定，无法从索引左侧开始定位。
```

## 【重点纠错】

这里是单列索引 `idx_title(title)`，不是联合索引。

不要把所有“左边匹配”的问题都说成联合索引最左前缀。

更准确：

```text
B+ 树按 title 从左到右排序。
前缀固定时可以定位。
前面模糊时无法定位起点。
```

---

## 题组 6：低区分度字段

SQL：

```sql
SELECT id, title
FROM article
WHERE status = 1;
```

假设 `status` 只有：

```text
0、1、2
```

问：只给 `status` 单独建索引一定好吗？

判断：

```text
不一定。
```

原因：

```text
status 区分度低，命中比例可能很高。
如果走 status 索引，要通过二级索引找到大量主键，再回表查 title。
当命中行数很多时，随机回表成本可能比全表扫描还高。
```

优化器可能不用索引的情况：

```text
表很小。
status = 1 命中比例很高。
查询字段不被索引覆盖，回表成本很高。
优化器估算全表扫描更便宜。
```

如果该查询很高频，可以考虑：

```sql
INDEX idx_status_title(status, title)
```

这样可能形成覆盖索引：

```text
status 用于过滤。
title 在索引中可以直接返回。
id 是二级索引叶子节点自带的主键。
```

但是否真的建，要结合：

```text
查询频率
数据量
status 分布
写入成本
是否还有其他更高频查询
```

---

# 7. 今日反复易错点

## 【反复易错 1】字段在联合索引里，不代表能直接用于排序

错误理解：

```text
create_time 在 (user_id,status,create_time) 里，
所以 WHERE user_id = 10 ORDER BY create_time 就能直接排序。
```

正确理解：

```text
联合索引按 user_id -> status -> create_time 排。
user_id 固定后，仍然先按 status 分组。
跳过 status 时，create_time 不是全局有序。
```

记忆：

```text
ORDER BY 要看索引顺序是否连续匹配。
不是字段在索引里就行。
```

---

## 【反复易错 2】ICP 不负责排序

错误表达：

```text
create_time 不能排序，可能通过 ICP 下推。
```

正确表达：

```text
ICP 是索引下推，用来在存储引擎层提前过滤 WHERE 条件，减少回表。
ORDER BY 能不能利用索引，取决于索引的有序结构。
```

一句话：

```text
过滤问题看 ICP。
排序问题看索引顺序。
```

---

## 【反复易错 3】`SELECT *` 的问题是回表，不是“不精确查找”

错误表达：

```text
SELECT * 不是精确查找，所以慢。
```

正确表达：

```text
WHERE 条件可能依然很精确。
慢在 SELECT * 需要返回索引里没有的字段，导致回表查整行。
```

尤其遇到：

```text
TEXT
BLOB
大 VARCHAR
很多列
```

回表成本会明显上升。

---

## 【反复易错 4】`IN` 能用索引过滤，但不一定能保证全局排序

SQL：

```sql
WHERE user_id = 10
  AND status IN (1, 2)
ORDER BY create_time DESC
```

索引：

```sql
(user_id, status, create_time)
```

正确判断：

```text
user_id、status 可以用于索引扫描。
但 status 有多个值，会形成多个 create_time 有序段。
多个段合起来不等于全局 create_time 有序。
所以 ORDER BY create_time 可能需要 filesort。
```

---

## 【反复易错 5】覆盖索引不是看 WHERE 是否包含所有索引字段

错误理解：

```text
WHERE 用到了联合索引所有字段，才叫覆盖索引。
```

正确理解：

```text
查询需要的字段都能从索引里拿到，才叫覆盖索引。
```

查询需要的字段包括：

```text
SELECT 字段
WHERE 字段
ORDER BY 字段
GROUP BY 字段
```

并且 InnoDB 二级索引叶子节点会带主键值，所以：

```text
SELECT id
```

通常可以被二级索引覆盖。

---

## 【反复易错 6】低区分度字段单独建索引不一定好

例如：

```sql
WHERE status = 1
```

如果 `status` 只有三种值，命中比例可能很高。

优化器可能认为：

```text
走索引 -> 查到大量主键 -> 大量回表
```

不如：

```text
直接全表扫描
```

所以面试不要说：

```text
WHERE 字段都应该建索引。
```

更严谨：

```text
高频查询、区分度高、能减少扫描行数、能覆盖查询或服务排序的字段，才更适合建索引。
```

---

# 8. 面试速背版

## EXPLAIN 怎么看

> 我看 EXPLAIN 时不会只看有没有索引，而是先看 `type` 判断访问方式，再看 `key` 是否用了预期索引，再看 `key_len` 判断联合索引用到几列，再看 `rows` 判断扫描量，最后看 `Extra` 有没有 `Using index`、`Using filesort`、`Using temporary` 等信号。

## `type = ALL` 怎么说

> `type = ALL` 表示全表扫描，但不一定必须优化。小表、结果集占比高、或者走索引回表成本更高时，全表扫描可能更划算。但如果是大表高频 SQL，并且 `rows` 很大，就需要重点优化。

## 覆盖索引怎么说

> 覆盖索引是指查询需要的字段都能从索引里直接拿到，不需要回表。InnoDB 的二级索引叶子节点会存索引列和主键值，所以查询主键 `id` 通常也能被二级索引覆盖。

## 回表怎么说

> 回表是指通过二级索引先查到主键，再拿主键去聚簇索引查整行数据。大量回表会增加随机 IO，尤其 `SELECT *` 或查询大字段时成本更高。

## 联合索引排序怎么说

> 联合索引不仅要看 WHERE 是否满足最左前缀，还要看 ORDER BY 是否匹配索引的有序结构。比如 `(user_id,status,create_time)` 在 `user_id` 固定后仍然先按 `status` 排，如果 SQL 跳过 `status` 直接 `ORDER BY create_time`，通常不能很好利用索引排序。

## `ORDER BY + LIMIT` 索引怎么设计

> 如果查询核心诉求是按时间取最新 N 条，索引设计要优先考虑排序顺序。比如 `WHERE user_id=? AND status IN (...) ORDER BY create_time DESC LIMIT 20`，`(user_id, create_time, status)` 可能比 `(user_id, status, create_time)` 更适合，因为它能按时间顺序扫描并尽快拿到前 N 条。

## `LIKE` 怎么说

> `LIKE 'abc%'` 是前缀匹配，可以利用 B+ 树的有序性；`LIKE '%abc'` 左模糊，无法确定索引扫描起点，通常不能有效利用普通 B+ 树索引。

## 低区分度字段怎么说

> 低区分度字段单独建索引不一定好，比如 `status` 只有几个值，命中比例高时走索引可能产生大量回表，优化器可能选择全表扫描。是否建索引要结合数据量、查询频率、命中比例、覆盖索引和写入成本判断。

---

# 9. 明天建议继续

明天适合继续：

```text
慢 SQL 排查流程 + EXPLAIN Extra 坏信号专项
```

建议顺序：

1. 慢查询日志怎么开、怎么看。
2. `EXPLAIN` 里 `Using filesort` 怎么优化。
3. `Using temporary` 常见于哪些 SQL。
4. 深分页为什么慢，怎么优化。
5. `count(*)` 慢怎么处理。

明天目标：

```text
不只会判断“这条 SQL 索引用得好不好”，
还要能回答“线上慢 SQL 我怎么定位、怎么改、怎么验证”。
```


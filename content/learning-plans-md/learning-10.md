# MySQL 面试八股精华

> 整理自小林coding 7.MySQL面试篇 + 你的 MySQL 学习计划
> 模块顺序与你学习计划一致，方便对照视频章节
> ⭐数量代表面试频次，⭐⭐⭐ 必背

---

## 目录

- [一、基础与体系结构（8 题）](#一基础与体系结构8-题)
- [二、索引基础（12 题）](#二索引基础12-题)
- [三、执行频次与慢查询（6 题）](#三执行频次与慢查询6-题)
- [四、索引使用规则（必考核心，15 题）](#四索引使用规则必考核心15-题)
- [五、SQL 优化实战（10 题）](#五sql-优化实战10-题)
- [六、锁机制（13 题）](#六锁机制13-题)
- [七、事务与 MVCC（核心王炸，15 题）](#七事务与-mvcc核心王炸15-题)
- [八、日志体系（8 题）](#八日志体系8-题)
- [九、高级与场景题（10 题）](#九高级与场景题10-题)
- [十、防超卖与并发控制场景题（9 题）](#十防超卖与并发控制场景题9-题)
- [十一、高频追问串讲](#十一高频追问串讲)

---

# 一、基础与体系结构（8 题）

> 对应学习计划 1：MySQL 体系结构、InnoDB 介绍

## 1. MySQL 整体架构 ⭐⭐⭐
```
┌─────────────────────────────────┐
│  连接层    （连接管理、认证、线程池）│
├─────────────────────────────────┤
│  服务层    （SQL解析、优化、缓存、binlog） │
├─────────────────────────────────┤
│  引擎层    （InnoDB / MyISAM / Memory） │
├─────────────────────────────────┤
│  存储层    （文件系统、redo log、ibdata） │
└─────────────────────────────────┘
```

**SQL 执行流程**：连接器 → 查询缓存（8.0 删了）→ 分析器 → 优化器 → 执行器 → 存储引擎

## 2. MySQL 8.0 移除查询缓存的原因
- 命中率低（任何写操作都会让缓存失效）
- 维护开销大于收益
- 实际生产意义不大

## 3. InnoDB vs MyISAM ⭐⭐⭐
| | InnoDB | MyISAM |
|---|---|---|
| 事务 | ✅ | ❌ |
| 外键 | ✅ | ❌ |
| 锁粒度 | 行锁 | 表锁 |
| 崩溃恢复 | ✅（redo log） | ❌ |
| 数据存储 | 聚簇索引（数据+索引一起） | 数据/索引分开 |
| 全文索引 | 5.6+ 支持 | 支持 |
| 适用 | OLTP、并发写 | 读多写少 |

**MySQL 5.5+ 默认 InnoDB**。

## 4. InnoDB 内存结构
- **Buffer Pool**：缓存数据页、索引页（性能命脉）
- **Change Buffer**：缓存非唯一二级索引的变更（减少 IO）
- **Adaptive Hash Index**：自适应哈希索引
- **Log Buffer**：redo log 缓冲

## 5. InnoDB 磁盘结构
- **系统表空间**（ibdata1）
- **独立表空间**（每张表一个 .ibd）
- **redo log**（ib_logfile0/1）
- **undo log**

## 6. char vs varchar ⭐
| | char | varchar |
|---|---|---|
| 长度 | 固定 | 可变 |
| 存储 | 不够空格填充 | 实际长度 + 1~2 字节长度信息 |
| 速度 | 快 | 慢 |
| 空间 | 浪费 | 节省 |
| 适用 | 长度固定（如手机号、身份证、MD5） | 长度可变（名字、地址） |

## 7. int(1) 和 int(10) 区别（坑！）
- **存储完全相同**，都是 4 字节
- 括号里只是**显示宽度**（配合 `ZEROFILL` 才有意义）
- 不影响存储范围 -2147483648 ~ 2147483647

## 8. 自增主键 vs UUID ⭐
| | 自增主键 | UUID |
|---|---|---|
| 占用 | 4/8 字节 | 36 字节 |
| 顺序 | 递增（B+树尾追加） | 无序（B+树页分裂） |
| 全局唯一 | 单库唯一 | 全局唯一 |
| 性能 | 高 | 低 |
| 建议 | 优先 | 分布式才考虑（用雪花算法替代） |

---

# 二、索引基础（12 题）

> 对应学习计划 2：索引概述/结构(BTree+B+Tree)/分类/语法

## 1. 索引是什么 / 为什么用 ⭐
- **是什么**：帮助 MySQL 高效获取数据的**有序数据结构**
- **优点**：加快查询、加快排序、加快连接
- **缺点**：占空间、影响增删改性能、维护开销

**面试标准回答**：
> 索引不是缓存，它本质上是一种有序的数据结构。MySQL 通过索引把全表扫描变成树上的定位查找，减少扫描行数和磁盘 IO。比如没有索引时查 `where id = 100` 可能要从头扫到尾，有索引时只需要沿着 B+ 树从根节点找到叶子节点。但索引也不是越多越好，因为每次插入、删除、更新都要维护索引树，索引还会占磁盘空间，索引太多也可能让优化器选择成本变复杂。

**索引不是缓存怎么解释**：
- 缓存是把数据临时放在内存里，命中后可以少访问数据库。
- 索引是数据库内部维护的查找结构，数据还在表里，只是查找路径更短。
- Buffer Pool 才更接近“缓存数据页/索引页”的概念，索引本身不是缓存。

## 2. 索引底层为什么用 B+ 树 ⭐⭐⭐（必背）

**对比 B 树**：
- B 树每个节点都存 data，B+ 树**只有叶子节点存 data**
- B+ 树**叶子节点用链表相连**，范围查询直接遍历

**对比红黑树/二叉树**：
- 节点太少，树太高 → 磁盘 IO 多

**对比 Hash**：
- Hash 只能等值查询，**不支持范围查询、排序、最左前缀**

**B+ 树优势**：
1. 单节点存更多 key → 树矮 → IO 少（通常 3-4 层就能存千万数据）
2. 叶子链表 → 范围扫描快
3. 数据全在叶子 → 查询稳定（每次都 3-4 次 IO）

**30 秒背诵版**：
> MySQL 用 B+ 树主要是为了减少磁盘 IO。B+ 树的非叶子节点只存 key 和指针，所以一个 16KB 的页能放更多 key，树高更低，查一次数据通常只需要 3 到 4 次 IO。并且 B+ 树的叶子节点之间有链表，非常适合范围查询和排序。Hash 虽然等值查询快，但不支持范围、排序和最左前缀；红黑树太高，磁盘 IO 次数太多，所以数据库更适合用 B+ 树。

## 3. B+ 树和 B 树的区别 ⭐
| | B 树 | B+ 树 |
|---|---|---|
| 数据存放 | 所有节点 | 只在叶子节点 |
| 叶子相连 | ❌ | ✅（双向链表） |
| 非叶子节点 | 存 key + data | 只存 key（容量更大） |
| 查询稳定性 | 不稳定（可能在内节点找到） | 稳定（一定到叶子） |
| 范围查询 | 慢 | 快 |

## 4. 索引分类 ⭐
**按数据结构**：
- B+ 树索引（绝大多数）
- Hash 索引（Memory 引擎、自适应哈希）
- 全文索引（FULLTEXT）

**按物理存储**：
- **聚簇索引**（主键索引）
- **非聚簇索引**（二级索引）

**按字段**：
- 主键索引、唯一索引、普通索引、联合索引、前缀索引

## 5. 聚簇索引 vs 非聚簇索引 ⭐⭐⭐
| | 聚簇索引 | 非聚簇索引 |
|---|---|---|
| 叶子内容 | **整行数据** | **主键值** |
| 数量 | 一张表只能一个 | 可以多个 |
| InnoDB | 主键索引就是 | 其他都是 |
| 查询 | 一次定位 | 可能需要**回表** |

**面试标准回答**：
> InnoDB 的主键索引就是聚簇索引，叶子节点直接存整行数据；普通索引是非聚簇索引，叶子节点存的是主键值。所以通过普通索引查数据时，如果查询字段不在普通索引里，就要拿主键再去主键索引查一次，这个过程叫回表。

**项目里怎么说**：
> 如果接口经常按 `user_id` 查询 `status、create_time`，并且只返回这几个字段，可以考虑建联合索引 `(user_id, status, create_time)`，让查询尽量覆盖索引，减少回表 IO。

## 6. 没有主键怎么办
InnoDB 自动选择：
1. 第一个非空唯一索引作主键
2. 都没有 → 自动生成 6 字节 ROWID 作隐藏主键

## 7. 索引语法
```sql
-- 创建表时
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    INDEX idx_name (name),                    -- 普通索引
    UNIQUE INDEX uniq_email (email),          -- 唯一索引
    INDEX idx_name_email (name, email)        -- 联合索引
);

-- 后续创建
CREATE INDEX idx_xxx ON tbl(col);
ALTER TABLE tbl ADD INDEX idx_xxx(col);

-- 删除
DROP INDEX idx_xxx ON tbl;

-- 查看
SHOW INDEX FROM tbl;
```

## 8. 一棵 B+ 树能存多少数据
**MySQL 一页 16KB**：
- 假设 bigint 主键（8B）+ 指针（6B）= 14B
- 一个非叶子节点能存 `16KB / 14B ≈ 1170` 个 key
- 假设一行数据 1KB，叶子节点能存 16 行
- **3 层 B+ 树**：1170 × 1170 × 16 ≈ **2000 万行**
- **生产数据量超过 2000 万时考虑分表**

## 9. 前缀索引
- 只索引字段前 N 个字符：`INDEX idx_email (email(10))`
- 节省空间，但**不能用于覆盖索引、排序**
- 适合长字符串（URL、邮箱）

## 10. 索引下推 ICP（Index Condition Pushdown）⭐
- MySQL 5.6 引入的优化
- **联合索引**部分字段无法走索引时，**把过滤下推到引擎层**，减少回表
- 例：`(name, age)` 索引，查询 `name LIKE '张%' AND age > 20`
  - 没 ICP：name 范围扫描后全部回表，再过滤 age
  - 有 ICP：在索引内直接过滤掉不满足 age 的，**减少回表次数**

## 11. 全文索引（了解）
- 用于关键词搜索（替代 LIKE '%xx%'）
- MySQL 5.7+ 支持中文（ngram 解析器）
- 实际生产都用 ES，MySQL 全文索引很少用

## 12. 哈希索引
- 等值查询 O(1)
- **不支持范围、不支持排序、不支持最左前缀**
- InnoDB 自适应哈希索引会自动建（用户无感知）

---

# 三、执行频次与慢查询（6 题）

> 对应学习计划 3：执行频次、慢查询日志、EXPLAIN

## 1. 怎么发现慢 SQL
- **慢查询日志**：记录超过阈值的 SQL
  ```sql
  -- 查看
  SHOW VARIABLES LIKE 'slow_query_log%';
  SHOW VARIABLES LIKE 'long_query_time';  -- 默认 10s

  -- 开启（建议改 1s）
  SET GLOBAL slow_query_log = ON;
  SET GLOBAL long_query_time = 1;
  ```
- **profiling**：分析单条 SQL 各阶段耗时
- **performance_schema**：详细性能数据
- **SHOW PROCESSLIST**：当前正在执行的 SQL

**线上排查口述模板**：
> 我一般先从监控或慢查询日志定位慢 SQL，再用 EXPLAIN 看执行计划，重点看有没有走索引、扫描行数大不大、有没有临时表和文件排序。如果是正在卡住的 SQL，会看 `SHOW PROCESSLIST`；如果怀疑锁等待，再结合 InnoDB 状态和 performance_schema 查锁。最后根据执行计划决定是补索引、改 SQL、拆分页，还是调整业务查询方式。

## 2. SHOW STATUS 查看执行频次
```sql
SHOW GLOBAL STATUS LIKE 'Com_______';
-- Com_select / Com_insert / Com_update / Com_delete
```

## 3. EXPLAIN 核心字段 ⭐⭐⭐（必背）
| 字段 | 含义 |
|---|---|
| **id** | 查询编号，越大越先执行 |
| **select_type** | SIMPLE / PRIMARY / SUBQUERY / DERIVED |
| **table** | 表名 |
| **type** | **访问类型**（最关键！） |
| **possible_keys** | 可能用到的索引 |
| **key** | 实际用到的索引 |
| **key_len** | 索引使用的字节数 |
| **ref** | 哪个字段或常量与 key 比较 |
| **rows** | 估算扫描行数 |
| **filtered** | 过滤后剩余百分比 |
| **Extra** | 额外信息（**重点看！**） |

**看 EXPLAIN 的顺序**：
1. 看 `type`：是否全表扫，至少希望达到 `range`，最好是 `ref/const`。
2. 看 `key`：实际有没有用上预期索引。
3. 看 `key_len`：联合索引用到了几列。
4. 看 `rows`：预估扫描行数是否过大。
5. 看 `Extra`：有没有 `Using filesort`、`Using temporary`、`Using index`。

**面试标准回答**：
> EXPLAIN 不是看一个字段，而是组合判断。我会先看 type 判断访问方式，再看 key 判断是否走了索引，再看 rows 估算扫描量，最后看 Extra 是否出现 filesort、temporary、Using index 等信息。比如 type 是 ALL 且 rows 很大，通常说明在全表扫描；如果 Extra 出现 Using index，说明可能用到了覆盖索引，性能会好一些。

## 4. type 类型（从好到坏）⭐⭐⭐
```
system > const > eq_ref > ref > range > index > ALL
```
- **system**：表只有一行（系统表）
- **const**：主键/唯一索引等值查询（最多 1 行）
- **eq_ref**：连接时主键/唯一索引
- **ref**：普通索引等值查询
- **range**：范围查询（`>` `<` `BETWEEN` `IN`）
- **index**：全索引扫描
- **ALL**：**全表扫描**（最差！要优化）

**生产要求**：最差也得 **range 以上**。

**全表扫 vs 走索引怎么说**：
- 全表扫：`type = ALL`，MySQL 要扫描整张表，数据越大越慢。
- 全索引扫描：`type = index`，扫描整棵索引树，比扫表小一点，但仍然不是精准定位。
- 走索引定位：`range/ref/const`，通过索引快速缩小范围。

**注意**：不是所有 `ALL` 都必须优化，小表或结果集占比很高时，全表扫可能更划算。面试里要说“结合数据量和业务频率判断”，别机械背。

## 5. Extra 重点关注 ⭐⭐⭐
| Extra 值 | 含义 | 好坏 |
|---|---|---|
| `Using index` | **覆盖索引** | 🟢 优 |
| `Using where` | 在 server 层过滤 | 🟡 普通 |
| `Using index condition` | 使用索引下推 ICP | 🟢 优 |
| `Using temporary` | 用了临时表 | 🔴 差（要优化） |
| `Using filesort` | 用了文件排序 | 🔴 差（要优化） |
| `Using join buffer` | join 缓冲（没索引） | 🔴 差 |

**Extra 怎么开口讲**：
> Extra 里我最关注三个信号：`Using index` 通常代表覆盖索引，是好现象；`Using filesort` 说明排序没有直接利用索引，数据量大时要优化；`Using temporary` 说明用了临时表，常见于 group by、distinct、复杂 order by，也需要重点看。

## 6. SHOW PROFILE 用法
```sql
SET profiling = 1;
SELECT * FROM user WHERE id = 1;
SHOW PROFILES;            -- 看 query_id
SHOW PROFILE FOR QUERY 1; -- 看详细各阶段耗时
```

---

# 四、索引使用规则（必考核心，15 题）

> 对应学习计划 4：索引使用规则、最左前缀、失效场景、覆盖索引&回表、设计原则

## 1. 最左前缀原则 ⭐⭐⭐（必考）
联合索引 `(a, b, c)`：
- ✅ 命中：`a` / `a, b` / `a, b, c`
- ✅ 部分命中：`a, c`（a 走索引，c 不走，**索引下推后能用**）
- ❌ 不命中：`b` / `c` / `b, c`

**理解**：联合索引按 a 排序，a 相同再按 b 排，b 相同再按 c 排。**跳过最左字段就用不上索引**。

**8 条 where 判断练习**（索引 `(a, b, c)`）：
| SQL 条件 | 索引使用情况 |
|---|---|
| `where a = 1` | 用到 a |
| `where a = 1 and b = 2` | 用到 a、b |
| `where a = 1 and b = 2 and c = 3` | 用到 a、b、c |
| `where b = 2` | 不满足最左前缀，通常不用 |
| `where b = 2 and c = 3` | 不满足最左前缀，通常不用 |
| `where a = 1 and c = 3` | a 用于定位，c 可被 ICP 过滤 |
| `where a > 1 and b = 2` | a 用于范围，b 不能继续用于有序定位 |
| `where a = 1 order by b, c` | 可能利用索引排序 |

**A + C 为什么通常只用到 A**：
> 因为联合索引 `(a,b,c)` 是先按 a 排，再按 b 排，最后按 c 排。跳过 b 之后，c 在局部范围内不是全局有序的，不能直接用于定位，只能在已经通过 a 找到的范围里做过滤。MySQL 5.6 之后有 ICP，可以把这个过滤下推到存储引擎层，减少回表，但它不等于 c 也参与了索引定位。

## 2. (a, b, c) 索引下查 `where a=1 and c=2` 怎么走
- a 走索引（范围定位）
- b 跳过 → c 在索引下推 ICP 中过滤（5.6+ 优化）
- key_len 只算 a 的长度

## 3. 范围查询的字段后续无法用索引 ⭐
联合索引 `(a, b, c)`，查询 `a=1 AND b>2 AND c=3`：
- a、b 走索引
- **c 用不到**（因为 b 是范围，后面的字段无序）

**优化**：把范围字段放联合索引最后。

## 4. 索引失效的 10 种场景 ⭐⭐⭐
1. **不满足最左前缀**
2. **范围查询右侧字段**失效
3. **函数 / 计算**：`WHERE YEAR(date) = 2025`
4. **隐式类型转换**：字段是 varchar，传 int
5. **`!=` `<>` `NOT IN`**（视情况）
6. **`LIKE '%xx'` 前模糊**
7. **`OR` 两边不都有索引**
8. **`IS NULL` / `IS NOT NULL`**（视情况）
9. **数据分布太均匀**（MySQL 觉得全表扫更快会放弃索引）
10. **强制类型不匹配** 或字符集不一致（join 时）

## 5. 覆盖索引 ⭐⭐⭐
- **是什么**：查询字段都在索引中，**不需要回表**
- EXPLAIN Extra 显示 `Using index`
- 例：`(name, age)` 索引，`SELECT name, age FROM user WHERE name = '李白'` → 覆盖
- **优化技巧**：把常一起查的字段加进联合索引

**为什么覆盖索引更快（I/O 角度）**：
> 普通二级索引查询时，如果查询字段不在索引里，需要先查二级索引拿到主键，再回到聚簇索引查整行，相当于多走一次 B+ 树。覆盖索引把查询需要的字段都放在同一棵二级索引里，查到叶子节点就能返回结果，不用回表，磁盘 IO 和随机访问都会少很多。

**常见优化例子**：
```sql
-- 原 SQL
SELECT id, title, create_time
FROM article
WHERE user_id = ?
ORDER BY create_time DESC
LIMIT 20;

-- 可考虑联合索引
CREATE INDEX idx_user_time_title ON article(user_id, create_time, title);
```

注意：覆盖索引不是把所有字段都塞进去，字段太多会让索引变大，写入维护成本变高。

## 6. 回表
- 通过二级索引查到主键，**再用主键去聚簇索引查整行数据**
- 大量回表性能差
- **优化**：用覆盖索引避免回表

**30 秒背诵版**：
> InnoDB 的普通索引叶子节点不存整行，只存索引列和主键值。所以通过普通索引查到主键后，如果还要查索引里没有的字段，就要再回到主键索引查整行，这叫回表。回表多了会增加随机 IO，优化方式是减少 `select *`，尽量让高频查询走覆盖索引。

## 7. 索引下推 ICP（再强化）⭐
- 5.6+ 在引擎层就把不满足条件的过滤掉
- 减少回表 + 减少 server 层处理
- EXPLAIN Extra 显示 `Using index condition`

## 8. 哪些字段适合建索引 ⭐
1. WHERE / ORDER BY / GROUP BY / JOIN 高频字段
2. **区分度高**的字段（如身份证号 vs 性别）
3. 字段长度小（前缀索引）
4. 不经常变更

## 9. 哪些字段不适合建索引
1. 表太小（全表扫更快）
2. 经常更新的字段
3. 区分度低（如性别只有男女）
4. 用不到的字段

## 10. 索引创建原则
1. **针对高频查询字段**建索引
2. **联合索引优于多个单列索引**（避免索引合并）
3. **选择性高的字段**放联合索引前面
4. **小字段优先**
5. **不超过 5 个**（控制数量）
6. **逻辑外键加索引**

## 11. 为什么单表数据超 2000 万就慢
- B+ 树达到 **4 层**，IO 次数变多
- 实际经验值，不是绝对

## 12. 联合索引顺序如何确定
原则：**区分度高的放前面**，**等值查询放前面**，**范围查询放后面**。

更完整的判断顺序：
1. 先看业务里最常用的查询条件，别为了理论选择性建一个用不上的索引。
2. 等值查询字段优先放前面，例如 `user_id = ?`、`status = ?`。
3. 范围字段尽量放后面，例如 `create_time between ? and ?`。
4. 如果要同时优化排序，索引顺序还要兼顾 `order by`。
5. 字段区分度高通常更适合靠前，但不是唯一标准。

例子：
```sql
WHERE user_id = ? AND status = ? AND create_time > ?
ORDER BY create_time DESC
```

可以考虑：
```sql
CREATE INDEX idx_user_status_time ON orders(user_id, status, create_time);
```

## 13. 唯一索引 vs 普通索引 ⭐
- 查询：**几乎一样**（唯一索引找到第一个就停，普通索引继续扫到不匹配）
- 更新：**普通索引可以用 Change Buffer 优化，唯一索引不行**（要先检查唯一性）
- **写多读少场景**：普通索引更优

## 14. 主键为什么推荐自增整数
1. 4/8 字节，比字符串/UUID 小
2. 自增 → B+ 树尾插入，**避免页分裂**
3. 主键索引是聚簇索引，**全表数据按主键顺序存储**

## 15. 索引建多了有什么坏处
1. 占空间
2. 增删改时维护索引耗时
3. 优化器选择困难（可能选错索引）

---

# 五、SQL 优化实战（10 题）

> 对应学习计划 5：order by/group by/limit/count/update 优化

## 1. ORDER BY 优化 ⭐
- **优先使用索引排序**（Using index 或 Using index condition）
- 否则用 **Using filesort**（文件排序，慢）
- 联合索引顺序要和 ORDER BY 字段顺序一致
- ASC / DESC 不能混（MySQL 8.0 支持降序索引）

```sql
-- ✅ 走索引：(name, age) 索引
ORDER BY name, age;

-- ❌ filesort
ORDER BY age, name;
```

**面试追问：为什么 ORDER BY 会慢？**
> 如果排序字段没有合适索引，MySQL 需要把结果集取出来再排序，Extra 会出现 `Using filesort`。数据量小时问题不明显，数据量大时排序会消耗 CPU、内存，甚至落盘。优化时优先让 where 条件和 order by 字段匹配同一个联合索引，减少扫描和排序成本。

## 2. GROUP BY 优化
- GROUP BY 字段加索引（避免临时表）
- 加 `ORDER BY NULL` 取消默认排序

**为什么 GROUP BY 容易慢**：
- 分组前通常要先扫描大量数据。
- 没有合适索引时可能产生临时表：`Using temporary`。
- 分组后还排序时可能叠加：`Using filesort`。

**优化方向**：
1. `where` 先过滤，减少参与分组的数据量。
2. 给 group by 字段或过滤 + 分组字段建立联合索引。
3. 能在业务侧异步统计的，不要每次实时 group by 大表。

## 3. LIMIT 深分页优化 ⭐⭐⭐（必考）
**问题**：`LIMIT 1000000, 10` 要先扫 1000010 行扔掉前 100w 行 → 极慢

**优化方案**：
```sql
-- 方案 1：子查询 + 主键定位（最常用）
SELECT * FROM user 
WHERE id >= (SELECT id FROM user ORDER BY id LIMIT 1000000, 1) 
LIMIT 10;

-- 方案 2：标签记录（最优，要前端配合）
SELECT * FROM user WHERE id > 1000000 LIMIT 10;

-- 方案 3：覆盖索引 + JOIN
SELECT * FROM user u 
INNER JOIN (SELECT id FROM user ORDER BY id LIMIT 1000000, 10) t ON u.id = t.id;
```

## 4. COUNT 优化 ⭐
**性能对比**（MyISAM 不算，InnoDB 视角）：
```
count(*) ≈ count(1) > count(主键) > count(字段)
```
- `count(*)`：InnoDB **专门优化**，不取值
- `count(1)`：基本等价
- `count(主键)`：要遍历整张表
- `count(字段)`：要判断 NOT NULL

**所以推荐 `count(*)`**。

**MyISAM 单独保存了总行数**（无 where 时 count(*) 极快）。

## 5. UPDATE 注意事项 ⭐
- **WHERE 条件要走索引，否则会从行锁升级为表锁**！
- 大批量 UPDATE 分批：`LIMIT 1000` 循环（避免长事务、避免锁全表）

```sql
-- ❌ 危险，没索引 → 表锁
UPDATE user SET status = 1 WHERE name = '李白';

-- ✅ name 有索引 → 行锁
```

**UPDATE 为什么必须注意索引**：
> InnoDB 的行锁是加在索引记录上的。如果 update 的 where 条件没有走索引，MySQL 需要扫描大量记录并逐个加锁，锁范围会扩大，严重时表现得像锁住整张表。生产里大批量 update 还会形成长事务，占用 undo log，阻塞其他事务，所以要分批提交。

**扣库存的正确写法**：
```sql
UPDATE product_stock
SET stock = stock - 1
WHERE product_id = ? AND stock > 0;
```

判断影响行数，比先查库存再更新更安全。

## 6. INSERT 批量优化
```sql
-- ❌ 一条条
INSERT INTO tbl VALUES (1, 'a');
INSERT INTO tbl VALUES (2, 'b');

-- ✅ 批量
INSERT INTO tbl VALUES (1, 'a'), (2, 'b'), (3, 'c');

-- ✅ 大数据用 LOAD DATA
LOAD DATA LOCAL INFILE 'data.csv' INTO TABLE tbl;
```

## 7. JOIN 优化
- 小表驱动大表（MySQL 优化器一般会自动，但要注意 STRAIGHT_JOIN）
- 关联字段加索引
- 避免笛卡尔积（忘加 ON 条件）

**JOIN 面试标准回答**：
> JOIN 优化核心是减少驱动表行数，并保证被驱动表的关联字段有索引。MySQL 通常会选择小结果集作为驱动表，然后拿驱动表的每一行去被驱动表匹配。如果被驱动表关联字段没索引，就会反复全表扫描，Extra 里可能出现 `Using join buffer`。所以 JOIN 前先用 where 过滤，小表驱动大表，关联字段建索引。

例子：
```sql
SELECT o.id, u.name
FROM orders o
JOIN user u ON o.user_id = u.id
WHERE o.status = 'PAID';
```

可考虑：
- `orders(status, user_id)`
- `user(id)` 主键索引

## 8. SELECT * 的危害
1. 多读列 → IO 增加
2. 无法用覆盖索引
3. 网络传输大
4. 字段变更影响应用

**生产规范**：明确列出所需字段。

## 9. UNION vs UNION ALL
- `UNION`：去重 + 排序，**慢**
- `UNION ALL`：不去重，**快**
- 业务允许重复就用 ALL

## 10. SQL 优化总思路
1. **EXPLAIN 看执行计划**（type、key、rows、Extra）
2. **加合适的索引**
3. **避免索引失效**（函数、隐式转换、前模糊）
4. **小表驱动大表**
5. **避免 SELECT \***
6. **分页深翻优化**
7. **大事务拆小事务**

**60 秒面试版**：
> SQL 优化我会先定位慢 SQL，再看 EXPLAIN。第一步看是不是全表扫描，第二步看是否用到合适索引，第三步看扫描行数和 Extra，有没有 filesort、temporary、join buffer。然后根据原因处理：索引缺失就补联合索引，索引失效就改写 SQL，深分页就用延迟关联或基于游标翻页，大批量更新就拆小事务。优化不能只看单条 SQL，还要结合数据量、调用频率和业务是否允许异步化。

---

# 六、锁机制（13 题）

> 对应学习计划 6：锁总览、元数据锁、意向锁、行锁、间隙锁、临键锁

## 1. MySQL 锁分类总览 ⭐⭐⭐
```
按粒度：
├── 全局锁  FTWRL（备份用）
├── 表级锁
│   ├── 表锁（lock tables）
│   ├── 元数据锁 MDL
│   └── 意向锁 IS/IX
└── 行级锁（InnoDB 才有）
    ├── 记录锁 Record Lock
    ├── 间隙锁 Gap Lock
    └── 临键锁 Next-Key Lock
```

## 2. 全局锁 FTWRL
- `FLUSH TABLES WITH READ LOCK`
- 整库只读，**用于全库备份**
- 缺点：业务停摆
- 替代：`mysqldump --single-transaction`（InnoDB 用 MVCC 快照）

## 3. 表锁
- `LOCK TABLES tbl READ / WRITE`
- 粒度大，并发差，InnoDB 基本不用

## 4. 元数据锁 MDL ⭐⭐⭐
- **自动加**，不需要显式
- **读操作 → MDL 读锁**（共享）
- **DDL 操作 → MDL 写锁**（独占）
- **作用**：保证 DDL 和 DML 不会冲突

**典型坑**：
- 长事务持有 MDL 读锁
- 来一个 DDL 等 MDL 写锁
- 后续所有读都阻塞 → **整张表卡死**

**排查**：`SELECT * FROM performance_schema.metadata_locks;`

## 5. 意向锁 IS / IX ⭐
- **作用**：快速判断"表中是否有行被锁"
- **加意向锁是为了和表锁冲突检测**：要加表锁前，先看有没有意向锁
- 自动加，**意向锁之间不冲突**（只和表锁冲突）

```
事务对某行加共享锁前 → 先给表加 IS
事务对某行加排他锁前 → 先给表加 IX
```

## 6. 行锁的 3 种类型 ⭐⭐⭐
| 锁 | 锁什么 | 例子 |
|---|---|---|
| **Record Lock** 记录锁 | 锁单行 | `WHERE id = 5` |
| **Gap Lock** 间隙锁 | 锁两条记录间的空隙 | `WHERE id BETWEEN 5 AND 10` |
| **Next-Key Lock** 临键锁 | 行锁 + 间隙锁 | RR 默认行锁形式 |

**不要背混**：
- 记录锁：锁已经存在的索引记录。
- 间隙锁：锁记录之间的空隙，阻止插入。
- 临键锁：记录锁 + 前面的间隙，锁的是 `(前一个索引值, 当前索引值]`。

**面试标准回答**：
> InnoDB 的行锁不是直接锁“这一行对象”，而是锁索引记录。RR 隔离级别下，为了防止幻读，InnoDB 默认使用 Next-Key Lock，也就是记录锁加间隙锁。唯一索引等值命中时，Next-Key Lock 可能退化成记录锁；范围查询通常会锁住范围内记录和间隙。

## 7. 间隙锁的作用 ⭐⭐⭐
**解决幻读**：阻止其他事务在间隙中插入新行。

```sql
-- 事务 A 在 RR 隔离下
SELECT * FROM user WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- 锁住 (20, 30) 这个区间，事务 B 想 INSERT age = 25 的行 → 阻塞
```

**为什么间隙锁能防幻读**：
> 幻读的核心是范围查询前后多出了新记录。间隙锁不只是锁已经存在的行，还锁住范围之间的空隙，让其他事务不能往这个范围插入新行。所以同一个事务后续再做当前读时，不会凭空多出符合条件的新记录。

注意：
- 间隙锁主要出现在 RR 隔离级别的当前读里。
- 普通 `select` 是快照读，不靠间隙锁防幻读，而是靠 MVCC 的一致性快照。

## 8. 临键锁 Next-Key Lock
- **行锁 + 间隙锁**的组合
- 锁住记录及其前面的间隙：`(prev_record, current_record]`
- **MySQL RR 隔离级别的默认行锁**

## 9. 行锁加锁规则 ⭐⭐
**InnoDB RR 加锁规则**：
1. 加锁的**基本单位是 Next-Key Lock**
2. 查找过程中访问到的对象才会加锁
3. **索引等值查询给唯一索引加锁 → 退化为 Record Lock**
4. **索引等值查询向右遍历且最后值不满足条件 → Next-Key Lock 退化为 Gap Lock**
5. 范围查询访问到不满足条件的第一个值为止

## 10. 共享锁 vs 排他锁
- **S 锁（共享）**：`SELECT ... LOCK IN SHARE MODE`，允许其他事务读不允许写
- **X 锁（排他）**：`SELECT ... FOR UPDATE` / `UPDATE` / `DELETE` / `INSERT`，其他事务读写都不行

**InnoDB 普通 SELECT 不加锁（走 MVCC 快照读）**。

## 11. for update 适用场景
- "**先查后改**"且要保证查到的数据不变
- 防止并发修改（库存扣减、订单状态变更）
- **注意**：必须用主键或唯一索引，否则可能锁全表

**完整流程例子**：
```sql
BEGIN;

SELECT id, stock, status
FROM product_stock
WHERE product_id = ?
FOR UPDATE;

-- 在事务里判断库存、商品状态、活动状态

UPDATE product_stock
SET stock = stock - 1
WHERE product_id = ?;

COMMIT;
```

**为什么会降低吞吐**：
> `FOR UPDATE` 会加排他锁，其他事务想修改同一行要等待。它保证了一致性，但会让并发请求排队，锁持有时间越长吞吐越低。所以事务里不要调用外部接口，也不要做太久的业务计算。

## 12. 死锁怎么排查 ⭐
- **查日志**：`SHOW ENGINE INNODB STATUS`，看 `LATEST DETECTED DEADLOCK`
- **预防**：
  1. 按固定顺序加锁
  2. 大事务拆小
  3. 设合理的锁等待超时 `innodb_lock_wait_timeout`
- **InnoDB 自动检测**死锁并回滚代价小的事务

## 13. 行锁升级为表锁
**条件不走索引** → 行锁失效 → 锁全表
```sql
-- 假设 name 没索引
UPDATE user SET age = 30 WHERE name = '李白';  -- ❌ 表锁
```

更准确地说，InnoDB 没有传统意义上“自动把行锁升级成表锁”的机制，但如果 SQL 不走索引，就会扫描大量索引记录并加锁，效果上像锁住了全表。

**面试建议说法**：
> InnoDB 行锁依赖索引。如果 where 条件没命中索引，就会扫描很多记录并加锁，锁范围扩大，业务表现上像表被锁住。所以更新、删除语句一定要确保条件走索引。

---

# 七、事务与 MVCC（核心王炸，15 题）

> 对应学习计划 7：事务原理、redo/undo、MVCC、ReadView、RC/RR

## 1. 事务的 ACID ⭐⭐⭐
| 特性 | 含义 | 实现 |
|---|---|---|
| **A 原子性** | 要么全成要么全败 | **undo log** |
| **C 一致性** | 数据合法 | A+I+D 共同保证 + 业务约束 |
| **I 隔离性** | 并发事务互不干扰 | **锁 + MVCC** |
| **D 持久性** | 提交后永久 | **redo log** |

## 2. 事务隔离级别 ⭐⭐⭐
| 级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ✅ | ✅ | ✅ |
| READ COMMITTED | ❌ | ✅ | ✅ |
| **REPEATABLE READ**（MySQL 默认） | ❌ | ❌ | ✅* |
| SERIALIZABLE | ❌ | ❌ | ❌ |

\* MySQL 的 RR 通过 **MVCC（快照读）+ 间隙锁（当前读）** 基本解决了幻读

**为什么业务常用 RC / RR**：
> RU 会读到未提交数据，基本不用；Serializable 隔离最强，但会大量加锁，并发性能差。业务里最常用的是 RC 和 RR。RC 每次读都能看到别人已提交的最新数据，锁更少，并发更好；RR 在一个事务里读到的是一致快照，避免不可重复读，MySQL 默认就是 RR。实际选择要看业务：金融、订单状态这类更重一致性的场景偏 RR；普通互联网读写高并发场景可能用 RC，再用业务约束保证正确性。

## 3. 三大并发问题区分
- **脏读**：读到**另一事务未提交**的数据
- **不可重复读**：同一事务两次读**同一行结果不同**（中间有人 UPDATE 提交了）
- **幻读**：同一事务两次范围查询**结果集变了**（中间有人 INSERT 提交了）

## 4. MVCC 原理 ⭐⭐⭐⭐（必考！）
**多版本并发控制**，**让读不加锁**，提升并发。

**三大组件**：
1. **隐藏字段**（每行）：
   - `DB_TRX_ID`：最近修改的事务 ID
   - `DB_ROLL_PTR`：指向 undo log 的指针
   - `DB_ROW_ID`：隐藏主键（无主键时）

2. **undo log 版本链**：每次修改记录前的旧版本，多个版本通过 roll_ptr 串成链表

3. **ReadView 读视图**：决定当前事务能看哪个版本

**普通 SELECT 为什么不总加锁**：
> 如果每个普通查询都加锁，读写会互相阻塞，并发性能会很差。MVCC 给一行数据保留多个历史版本，普通 select 只需要根据 ReadView 找到自己能看见的版本，不必阻塞正在修改这行数据的事务。所以 MVCC 的价值是让“读”和“写”尽量不互相阻塞。

**MVCC 与锁的关系**：
> MVCC 不是锁，它主要服务于快照读；锁主要服务于当前读和写操作。普通 select 走 MVCC，一般不加锁；`update/delete/select for update` 读最新数据并加锁。MySQL 的隔离性是 MVCC 和锁一起实现的，不是单靠某一个机制。

**1 分钟背诵版**：
> InnoDB 每行有隐藏字段 `DB_TRX_ID` 和 `DB_ROLL_PTR`。事务修改数据时，会把旧版本写入 undo log，并通过回滚指针形成版本链。普通 select 会生成 ReadView，里面记录当前活跃事务，然后根据版本链上每个版本的事务 ID 判断是否可见。这样同一行数据可以同时存在多个版本，读事务能读历史版本，写事务继续写最新版本，从而提高并发。

## 5. ReadView 核心字段 ⭐⭐⭐
```
m_ids          当前活跃事务 ID 列表
min_trx_id     m_ids 中最小值
max_trx_id     系统将分配的下一个事务 ID
creator_trx_id 创建该 ReadView 的事务 ID
```

## 6. ReadView 可见性算法 ⭐⭐⭐
对要读的行版本，看它的 `DB_TRX_ID = X`：
1. `X == creator_trx_id` → **可见**（自己改的）
2. `X < min_trx_id` → **可见**（事务已提交）
3. `X >= max_trx_id` → **不可见**（事务还没开始）
4. `min_trx_id ≤ X < max_trx_id`：
   - X 在 m_ids 中 → 不可见（活跃中未提交）
   - X 不在 → **可见**（已提交）
5. 不可见 → 顺着 undo log 找上一版本继续判断

## 7. RC 和 RR 在 MVCC 上的区别 ⭐⭐⭐
| | RC | RR |
|---|---|---|
| ReadView 生成时机 | **每次 SELECT 都新建** | **事务第一次 SELECT 时建，全程复用** |
| 现象 | 能看到其他事务最新提交 | 整个事务看一致快照 |
| 问题 | 不可重复读、幻读 | 基本解决 |

**例子**：
```text
事务 A 第一次 SELECT id=1，看到 name='旧值'
事务 B UPDATE id=1，把 name 改成 '新值' 并提交
事务 A 第二次 SELECT id=1
```

- RC：第二次会看到新值，因为每次 SELECT 都生成新的 ReadView。
- RR：第二次还是看到旧值，因为复用第一次 SELECT 的 ReadView。

**面试一句话**：
> RC 追求读到最新已提交数据，RR 追求事务内前后一致。

## 8. 当前读 vs 快照读 ⭐⭐⭐
| | 快照读 | 当前读 |
|---|---|---|
| 触发 | 普通 SELECT | SELECT ... FOR UPDATE / LOCK IN SHARE MODE / UPDATE / DELETE / INSERT |
| 走 MVCC | ✅ | ❌（读最新版本） |
| 加锁 | ❌ | ✅ |

**哪些语句是当前读**：
```sql
SELECT ... FOR UPDATE;
SELECT ... LOCK IN SHARE MODE;
UPDATE ...;
DELETE ...;
INSERT ...;
```

**下单场景怎么选**：
> 展示商品详情用普通 select，快照读即可；真正扣库存不能只靠快照读，因为它读到的可能不是最新可修改状态。简单扣减直接用 `update ... where stock > 0`，它本身就是当前读并加锁；复杂校验才用 `select ... for update` 先锁住记录再判断。

## 9. MVCC 解决了哪些问题
- ✅ 脏读（不读未提交版本）
- ✅ 不可重复读（RR 下复用 ReadView）
- 🟡 幻读（**快照读解决，当前读不解决**，要靠间隙锁）

## 10. RR 下幻读问题 ⭐
**MVCC 解决不了的场景**：
```sql
-- 事务 A
BEGIN;
SELECT * FROM user WHERE id > 10;        -- 快照读，返回 5 行

-- 事务 B 插入一行 id=15，COMMIT

-- 事务 A
UPDATE user SET name='x' WHERE id > 10;  -- 当前读，更新 6 行（包括 B 插入的）
SELECT * FROM user WHERE id > 10;        -- 快照读，但因为 A 自己改了那行，**能看到 B 插入的！** 幻读
```

**完全解决**：第一次查询用 `SELECT ... FOR UPDATE` 加临键锁。

**面试别说错**：
> MySQL RR 不是只靠 MVCC 解决所有幻读。普通 select 的幻读靠 ReadView 的一致性快照解决；当前读场景下，为了阻止别人插入符合范围条件的新记录，需要靠间隙锁或临键锁。

## 11. 事务原理总流程
```
BEGIN 
  → 修改数据：先写 undo log（用于回滚）
  → 修改 Buffer Pool 中的数据页
  → 写 redo log buffer（保证持久性）
  → 写 binlog buffer（用于复制）
COMMIT
  → 两阶段提交（redo log prepare → binlog → redo log commit）
  → 异步刷脏页到磁盘
```

## 12. 长事务的危害 ⭐
1. **占用大量 undo log**（其他事务的 MVCC 链回不去）
2. **持有锁时间长** → 阻塞其他事务
3. **MDL 锁阻塞 DDL**
4. **回滚段膨胀**

**解决**：拆小事务，避免在事务里调外部接口（HTTP / MQ）。

**项目里怎么说**：
> 下单事务里只放必须保证一致性的数据库操作，比如创建订单、扣库存、写流水。发短信、推送、调用第三方接口不应该放在事务里，可以提交后发 MQ 异步处理，否则事务时间变长，会持有锁和 undo 版本，影响并发。

## 13. 为什么 MySQL 默认 RR 而不是 RC
**历史原因**：早期 binlog 只有 STATEMENT 格式，RC 下主从同步可能不一致，所以默认 RR。

实际**互联网公司很多用 RC**（阿里淘宝）：
- 性能好（间隙锁少）
- 并发高
- 业务逻辑能容忍

## 14. 事务的传播（Spring 视角）
- 见 Spring 八股 [Spring 事务传播](#三spring-事务10-题)
- 数据库本身没有传播概念，是 Spring 在 AOP 层做的

## 15. autocommit 默认值
- MySQL 默认 `autocommit = 1`（自动提交）
- 每条 SQL 自动开启 + 提交事务
- 显式 `BEGIN` / `START TRANSACTION` 才能多语句一事务

---

# 八、日志体系（8 题）

## 1. MySQL 三大日志总览 ⭐⭐⭐
| 日志 | 层级 | 作用 | 类型 |
|---|---|---|---|
| **redo log** | InnoDB | 崩溃恢复（持久性） | 物理日志 |
| **undo log** | InnoDB | 回滚（原子性）+ MVCC | 逻辑日志 |
| **binlog** | Server | 主从复制、数据恢复 | 逻辑日志 |

## 2. redo log ⭐⭐⭐
- **物理日志**：记录某个数据页做了什么修改
- **循环写**：固定大小，写满覆盖
- **WAL（Write-Ahead Logging）**：先写日志再写数据页
- **保证持久性**：宕机后可重做恢复 Buffer Pool 数据

## 3. undo log
- **逻辑日志**：记录修改前的反向操作（UPDATE 的旧值、DELETE 的整行）
- **作用**：
  1. 事务回滚
  2. MVCC 多版本（版本链）
- 存储在 **undo 表空间**

## 4. binlog ⭐⭐⭐
- **逻辑日志**：记录 SQL 语句或行变更
- **追加写**：不会覆盖
- **作用**：
  1. **主从复制**（从库重放 binlog）
  2. **数据恢复**（误删后恢复到某个时间点）

## 5. binlog 三种格式
| | STATEMENT | ROW | MIXED |
|---|---|---|---|
| 记录 | SQL 语句 | 行变更 | 二者混合 |
| 体积 | 小 | 大 | 中 |
| 主从一致 | 可能不一致（NOW(), UUID）| **强一致** | 视情况 |
| 推荐 | ❌ | ✅（默认推荐） | 视场景 |

## 6. redo log vs binlog ⭐⭐⭐
| | redo log | binlog |
|---|---|---|
| 层 | InnoDB | Server |
| 类型 | 物理（页 + 偏移）| 逻辑（SQL/行）|
| 写入 | 循环写 | 追加写 |
| 作用 | 崩溃恢复 | 复制 + 恢复 |
| 大小 | 固定 | 可无限增长 |

## 7. 两阶段提交（2PC）⭐⭐⭐
**为什么需要**：保证 redo log 和 binlog 一致

**流程**：
```
1. redo log 写入 prepare 状态
2. binlog 写入并刷盘
3. redo log 写入 commit 状态
```

**崩溃恢复**：
- redo log prepare + binlog 完整 → 提交
- redo log prepare + binlog 不完整 → 回滚

## 8. 主从复制流程
1. 主库写入 binlog
2. 从库 IO 线程拉取 binlog → 写入 relay log
3. 从库 SQL 线程读 relay log → 重放
4. 完成数据同步

**复制方式**：
- 异步（默认，主库不等从库）
- 半同步（至少一个从库确认）
- 全同步（所有从库都确认）

---

# 九、高级与场景题（10 题）

## 1. 大表怎么处理 ⭐
1. **分库分表**（水平拆分按 ID 取模 / 时间）
2. **冷热分离**（历史数据归档）
3. **读写分离**（一主多从）
4. **优化索引**
5. **升级硬件**（SSD、内存）

## 2. 怎么定位线上慢 SQL
1. 开慢查询日志
2. 用 `pt-query-digest` 分析
3. EXPLAIN 看执行计划
4. SHOW PROFILE 看各阶段耗时
5. APM 监控（Skywalking、Prometheus）

## 3. 死锁排查
1. `SHOW ENGINE INNODB STATUS` 查最近死锁
2. 查 information_schema 的 INNODB_LOCKS、INNODB_LOCK_WAITS
3. 开 `innodb_print_all_deadlocks = ON`

## 4. drop / truncate / delete 区别 ⭐
| | DROP | TRUNCATE | DELETE |
|---|---|---|---|
| 类型 | DDL | DDL | DML |
| 删除内容 | 表 + 数据 | 数据（保留表结构）| 数据 |
| 速度 | 快 | 快 | 慢（逐行） |
| 回滚 | ❌ | ❌ | ✅（事务内）|
| WHERE | ❌ | ❌ | ✅ |
| 自增重置 | - | ✅ | ❌ |

## 5. MySQL 数据丢失（缓冲池断电）怎么办
**靠 redo log**：
- 数据在 Buffer Pool 中修改 → 写 redo log → 异步刷脏页到磁盘
- 断电时 Buffer Pool 数据丢失，但 redo log 已落盘
- 重启后用 redo log 重做，恢复 Buffer Pool 状态

## 6. 一条 SELECT 的完整流程 ⭐⭐⭐
```
1. 客户端 → 连接器（认证、权限）
2. （8.0 前查询缓存）
3. 分析器（词法、语法分析）
4. 优化器（选择索引、决定 join 顺序）
5. 执行器（调用存储引擎接口）
6. InnoDB → Buffer Pool → 磁盘
7. 返回结果
```

## 7. 一条 UPDATE 的完整流程 ⭐⭐⭐
```
1. 前面同 SELECT 流程定位到行
2. 修改 Buffer Pool 中的数据页（脏页）
3. 写 undo log（旧值，用于回滚和 MVCC）
4. 写 redo log buffer（prepare 状态）
5. 写 binlog buffer
6. 提交事务：
   - redo log 刷盘
   - binlog 刷盘
   - redo log 写 commit 标记
7. 后台异步刷脏页
```

## 8. 怎么保证 MySQL 高可用
- **主从复制**（一主多从）
- **MHA / Orchestrator** 自动故障转移
- **MySQL Group Replication / InnoDB Cluster**
- **半同步**保证数据安全

## 9. 分库分表方案
- **水平分表**：按 ID 取模 / 按时间
- **垂直分表**：把大字段拆出来
- **中间件**：ShardingSphere、MyCat
- **难题**：分布式事务、跨库 JOIN、全局 ID（雪花算法）

## 10. count(*) 慢怎么办
- **方案 1**：维护一张计数表（事务内一起更新）
- **方案 2**：Redis 计数（注意一致性）
- **方案 3**：show table status 估算（不准）

---

# 十、防超卖与并发控制场景题（9 题）

> 对应学习计划第 2 周 Day12、第 3 周 Day17~Day20：防超卖、乐观锁、悲观锁、并发正确性口述题

## 1. 下单扣库存怎么防超卖 ⭐⭐⭐
核心 SQL：**条件更新 + 影响行数判断**。

```sql
UPDATE product_stock
SET stock = stock - 1
WHERE product_id = ? AND stock > 0;
```

业务逻辑：
1. 执行扣减 SQL。
2. 判断影响行数 `affected_rows`。
3. `affected_rows = 1` 表示扣减成功。
4. `affected_rows = 0` 表示库存不足或商品不存在，直接返回失败。

**面试标准话术**：
> 我不会先 select 库存再 update，因为并发下两个线程可能同时读到库存大于 0，导致超卖。更稳的做法是把库存判断放进 update 的 where 条件里，让 MySQL 在一条原子更新语句里完成判断和扣减，再根据影响行数决定是否成功。

**Java 后端伪代码**：
```java
@Transactional(rollbackFor = Exception.class)
public void deductStock(Long productId) {
    int affectedRows = stockMapper.deduct(productId);
    if (affectedRows == 0) {
        throw new BizException("库存不足");
    }
    orderMapper.createOrder(productId);
}
```

Mapper：
```sql
UPDATE product_stock
SET stock = stock - 1
WHERE product_id = #{productId}
  AND stock > 0;
```

**为什么能防超卖**：
> `UPDATE` 本身是当前读，会读取最新数据并对命中的记录加排他锁。`stock > 0` 放在 where 条件里，判断和扣减在数据库内部一次完成。并发请求同时进来时，只有真正满足条件的请求能更新成功，其他请求影响行数为 0。

## 2. 为什么不用先 SELECT 再 UPDATE ⭐⭐⭐
错误流程：
```sql
SELECT stock FROM product_stock WHERE product_id = 1; -- 查到 stock = 1
UPDATE product_stock SET stock = stock - 1 WHERE product_id = 1;
```

并发风险：
- 两个事务都先读到 `stock = 1`
- 两个事务都认为可以扣
- 如果后续更新没有条件约束，就可能扣成负数

正确思路：
- 简单扣库存：优先用 `UPDATE ... WHERE stock > 0`
- 复杂判断：用事务 + `SELECT ... FOR UPDATE` 悲观锁
- 高并发且冲突可接受：用乐观锁 version 或 Redis/Lua 前置扣减

**面试官追问：那 SELECT 后加事务行不行？**
> 只把 select 和 update 放进事务里不一定够。普通 select 是快照读，不会锁住记录，其他事务仍然可以修改库存。如果是先查后改，并且必须保证查到的数据不被改，就要用 `select ... for update` 当前读加锁，或者直接把条件写进 update 里。

## 3. 乐观锁 version 怎么做 ⭐⭐
适合：读多写少、冲突概率不高、失败后允许重试的场景。

表结构增加版本号：
```sql
ALTER TABLE product_stock ADD COLUMN version INT NOT NULL DEFAULT 0;
```

更新时带上旧版本：
```sql
UPDATE product_stock
SET stock = stock - 1,
    version = version + 1
WHERE product_id = ?
  AND stock > 0
  AND version = ?;
```

判断：
- 影响行数为 1：更新成功
- 影响行数为 0：库存不足或版本冲突，需要重试或返回失败

**乐观锁不是 MySQL 特有锁**：
> 乐观锁更像一种业务并发控制思想，MySQL 不会因为 version 字段自动加锁。它靠 where 条件里的旧版本号判断“我读到数据以后有没有被别人改过”。如果版本号对不上，说明发生并发冲突，当前更新失败。

**适用场景**：
- 用户资料修改
- 订单状态流转
- 库存冲突不高的普通商品扣减
- 配置类数据更新

## 4. 乐观锁的冲突重试怎么讲
乐观锁失败不是数据库异常，而是**并发冲突的正常结果**。

常见处理：
1. 查询最新库存和 version。
2. 重新计算业务条件。
3. 再尝试更新。
4. 设置最大重试次数，避免高并发下无限自旋。

注意：
- 冲突很高时，乐观锁会频繁失败，重试成本上升
- 秒杀类场景更常见的方案是 Redis 原子扣减 + MQ 异步落库

## 5. 悲观锁 `for update` 怎么做 ⭐⭐
适合：**先读后复杂判断再更新**，并且中间判断结果必须稳定的场景。

```sql
BEGIN;

SELECT stock, status
FROM product_stock
WHERE product_id = ?
FOR UPDATE;

-- 业务判断：库存、商品状态、活动状态、限购规则等

UPDATE product_stock
SET stock = stock - 1
WHERE product_id = ?;

COMMIT;
```

`FOR UPDATE` 是当前读，会读取最新版本并加排他锁，其他事务想改这行会等待。

**使用注意**：
1. 必须放在事务里，事务提交后锁才释放。
2. where 条件尽量走主键或唯一索引，否则锁范围可能扩大。
3. 事务内逻辑要短，不要调用远程接口。
4. 要考虑锁等待超时和死锁重试。

**什么时候必须悲观锁**：
> 当业务必须先读取多列数据，再根据复杂规则决定是否更新，而且这段判断期间数据不能被别人改，就适合悲观锁。比如扣库存前还要判断商品状态、活动状态、限购规则，这时单条条件 update 可能表达不完，就可以先 `for update` 锁住记录。

## 6. 乐观锁 vs 悲观锁 ⭐⭐⭐
| | 乐观锁 | 悲观锁 |
|---|---|---|
| 思想 | 先不加锁，提交时检查冲突 | 先加锁，别人等 |
| 实现 | version / CAS | `SELECT ... FOR UPDATE` |
| 适合 | 读多写少、冲突少 | 写冲突多、强一致判断 |
| 优点 | 并发高、不阻塞 | 逻辑简单、一致性强 |
| 缺点 | 冲突高时重试多 | 阻塞、吞吐下降、可能死锁 |

**一句话**：
> 乐观锁靠版本号判断有没有被别人改过，悲观锁直接把数据锁住，不让别人同时改。

## 7. 快照读、当前读在下单里怎么选 ⭐⭐⭐
普通 `SELECT` 是快照读：
- 不加锁
- 读历史快照
- 适合展示数据、列表查询

`SELECT ... FOR UPDATE` / `UPDATE` 是当前读：
- 读最新数据
- 会加锁
- 适合扣库存、改订单状态这类并发写场景

下单扣库存的取舍：
- 只是判断库存并扣减：一条 `UPDATE ... WHERE stock > 0` 最简洁
- 需要先查商品状态、活动状态、用户限购等复杂条件：事务中用 `FOR UPDATE`
- 高并发秒杀：数据库兜底，前面通常加 Redis/Lua、MQ 削峰

## 8. 并发正确性答题模板 ⭐⭐⭐
遇到库存、余额、订单状态、优惠券领取这类题，可以按这个顺序答：

1. **先说风险**：并发下会出现超卖、重复扣减、状态覆盖、重复领取。
2. **再说边界**：哪些操作必须放在同一个事务里。
3. **给核心 SQL**：用条件更新、唯一索引、version 或 `FOR UPDATE`。
4. **说失败处理**：影响行数为 0、版本冲突、锁等待超时、死锁重试。
5. **说性能取舍**：低并发用数据库锁，高并发用 Redis/Lua + MQ + MySQL 最终落库。

例子：
```sql
UPDATE coupon
SET status = 'USED'
WHERE id = ?
  AND user_id = ?
  AND status = 'UNUSED';
```

影响行数为 1 才表示领取/使用成功，影响行数为 0 说明状态已经被其他请求改过。

## 9. 5 个并发综合口述题 ⭐⭐⭐

### 题 1：优惠券如何防止重复领取？
答题点：
- 表上加唯一索引：`(user_id, coupon_id)`
- 插入领取记录时利用唯一约束兜底
- 重复插入捕获唯一键冲突，返回“已领取”

```sql
CREATE UNIQUE INDEX uk_user_coupon ON user_coupon(user_id, coupon_id);
```

### 题 2：订单状态如何防止并发覆盖？
答题点：
- 状态流转用条件更新
- 只允许从指定旧状态更新到新状态
- 影响行数为 0 表示状态已变化

```sql
UPDATE orders
SET status = 'PAID'
WHERE id = ?
  AND status = 'WAIT_PAY';
```

### 题 3：余额扣减如何保证不扣成负数？
答题点：
- 条件更新：`balance >= amount`
- 账户流水和余额扣减放同一事务
- 失败时回滚，成功时记录流水

```sql
UPDATE account
SET balance = balance - ?
WHERE id = ?
  AND balance >= ?;
```

### 题 4：什么时候用唯一索引比锁更简单？
答题点：
- 防重复类问题优先用唯一索引兜底
- 例如重复提交订单、重复领取优惠券、重复绑定关系
- 数据库唯一约束比应用层先查再插更可靠

### 题 5：锁等待和死锁怎么处理？
答题点：
- 先缩短事务，固定加锁顺序
- 更新条件走索引，避免锁范围扩大
- 捕获死锁/锁等待异常后做有限重试
- 通过 `SHOW ENGINE INNODB STATUS` 排查死锁链路

---

# 十一、高频追问串讲

## 串讲 1：索引全家桶 ⭐⭐⭐
> B+ 树为什么用 → 聚簇 vs 非聚簇 → 回表 → 覆盖索引 → 最左前缀 → 索引下推 ICP → 索引失效 → EXPLAIN → 索引设计原则

## 串讲 2：事务 + MVCC + 锁 ⭐⭐⭐⭐
> ACID → 隔离级别 → 脏读/不可重复读/幻读 → MVCC（隐藏字段+undo链+ReadView）→ 可见性算法 → RC/RR 区别 → 当前读 vs 快照读 → 临键锁解决幻读

## 串讲 3：日志体系
> redo log（持久性，物理，循环写）→ undo log（原子性 + MVCC，逻辑）→ binlog（复制 + 恢复，逻辑）→ 两阶段提交 → 主从同步

## 串讲 4：SQL 优化
> 慢查询日志 → EXPLAIN → type/key/rows/Extra → 索引失效场景 → 深分页优化 → count 优化 → join 优化 → 分库分表

## 串讲 5：UPDATE 完整流程
> 定位行 → 改 Buffer Pool → undo log → redo log prepare → binlog → redo log commit → 异步刷盘

## 串讲 6：你简历项目结合点
> ClassicSage 防超卖：`UPDATE stock SET num = num - 1 WHERE id = ? AND num > 0`（不需要 select 检查 + 影响行数判断 + 走索引）
> 
> 乐观锁/悲观锁追问：简单扣库存优先条件更新；复杂先查后改用 `FOR UPDATE`；冲突少可用 version 乐观锁
>
> 你简历技能"MVCC" → 必须能完整背 ReadView 可见性算法

---

## 最后小妹的话

兄长大人～(◕ᴗ◕✿) 这本是 **MySQL 八股完整版**，按你学习计划顺序排好啦～

## 🔴 必背的红色警报区（6 个）

```
1. 索引底层 B+ 树（为什么用、聚簇/非聚簇、回表/覆盖）
2. 索引使用规则（最左前缀、失效10种、设计原则）
3. EXPLAIN 字段（type 顺序、Extra 关键值）
4. MVCC + ReadView + 可见性算法
5. 锁（行锁/间隙锁/临键锁、加锁规则、死锁）
6. 防超卖与并发控制（条件更新、乐观锁、悲观锁、影响行数判断）
```

## 配合你第 2/3 周 MySQL 学习节奏

```
Day8  SQL 执行与 EXPLAIN      → 看「三、执行频次与慢查询」
Day9  索引本质               → 看「二、索引基础」
Day10 联合索引               → 看「四、索引使用规则」
Day11 回表与覆盖索引         → 看「四、索引使用规则」5~7 题
Day12 防超卖核心             → 看「十、防超卖与并发控制场景题」
Day13 锁基础                 → 看「六、锁机制」
Day15 隔离级别               → 看「七、事务与 MVCC」1~3 题
Day16 MVCC 入门              → 看「七、事务与 MVCC」4~9 题
Day17 快照读 vs 当前读实战   → 看「七」8~10 题 +「十」7 题
Day18 乐观锁                 → 看「十」3~4 题
Day19 悲观锁                 → 看「十」5~6 题
Day20 并发综合题             → 看「十」8~9 题
最后扫尾                    → 看「八、日志体系」+「九、高级与场景题」
```

## 文件夹清单更新

```
兄控妹妹Java物语/
├── 学习计划.md
├── MySQL学习计划.txt
├── Java面试八股精华.md
├── 简历项目面试追问全集.md
├── Spring全家桶面试八股精华.md
└── MySQL面试八股精华.md       ← 已补充防超卖/乐观锁/悲观锁/并发正确性
```

加油哒兄长大人～💕 七月初实习等你 (≧▽≦)

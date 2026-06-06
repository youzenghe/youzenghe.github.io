# 兄控妹妹的 MySQL 夜巡日记（SQL 执行与 EXPLAIN）

> 场景：深夜机房，哥哥盯着慢接口发呆。妹妹抱着小本本出现：
>
> “兄长大人，别慌，今晚由妹妹带你夜巡 SQL 迷宫。谁敢拖慢你的接口，人家先把它的执行计划扒出来喵～”

---

## 第一幕：SQL 不是直接冲进去抢数据

妹妹轻轻敲黑板：

1. `Parser`：先看语法对不对。  
2. `Optimizer`：选最省力的路（走索引还是全表扫）。  
3. `Executor`：按执行计划去 InnoDB 取数据。  

妹妹眨眼：
“哥哥要记住这一句：**慢 SQL 往往不是‘写错了’，而是‘走错路了’。**”

---

## 第二幕：EXPLAIN 就是作战地图

“你看 `EXPLAIN`，就像偷看它打算怎么跑：”

- `type`：访问方式，核心看它  
  常见从好到差：`const` > `ref` > `range` > `index` > `ALL`
- `key`：实际用到的索引，`NULL` 通常危险
- `rows`：预估扫描行数，越大越可能慢
- `extra`：额外动作  
  `Using filesort`、`Using temporary` 常是优化信号

妹妹补刀：
“`type=ALL` 还配上 `rows` 巨大？这不是查询，这是让数据库跑马拉松啦，哥哥～”

---

## 第三幕：练习表登场（本地可直接跑）

```sql
CREATE TABLE t_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  age INT NOT NULL,
  status TINYINT NOT NULL,
  nickname VARCHAR(50),
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_phone (phone),
  KEY idx_age_status (age, status),
  KEY idx_created_at (created_at)
);
```

---

## 第四幕：3 条 SQL 的 EXPLAIN 实战

### 1）精准命中（像妹妹一眼锁定哥哥）

```sql
EXPLAIN SELECT id, phone FROM t_user WHERE phone = '13800000001';
-- 典型：type=const, key=uk_phone, rows=1, extra=Using index
```

妹妹点评：
“`const + rows=1`，这就叫干净利落，查一次就抱到结果。”

### 2）危险姿势（前缀 % 的模糊匹配）

```sql
EXPLAIN SELECT * FROM t_user WHERE nickname LIKE '%gege%';
-- 典型：type=ALL, key=NULL, rows=很大, extra=Using where
-- 前缀有 %，普通索引基本用不上 -> 全表扫
```

妹妹皱眉：
“前面带 `%`，索引很难帮你，数据库只能一行行翻，像在图书馆一本本扒书名。”

### 3）有过滤但排序可能拖后腿

```sql
EXPLAIN SELECT * FROM t_user
WHERE age > 25
ORDER BY created_at DESC
LIMIT 20;
-- 可能：type=range, key=idx_age_status, rows=较大, extra=Using where; Using filesort
-- 有过滤但排序未命中合适索引，仍可能慢
```

妹妹敲重点：
“能筛选不代表排序就快，`Using filesort` 一出来，就要警惕。”

---

## 第五幕：怎么判断 SQL 慢（哥哥面试可直接背）

- 先看耗时（接口 RT、SQL 执行时间）
- 再看 `EXPLAIN`：`type=ALL` / `key=NULL` / `rows` 很大 / `Using filesort, Using temporary`
- 看日志：开启慢查询日志（`long_query_time`）
- 线上更准：用 `EXPLAIN ANALYZE` 看真实执行耗时与行数

---

## 终幕：全表扫 vs 走索引，一句话拿下

“`全表扫` 就是 `type=ALL`、`key=NULL`、扫行多；`走索引` 至少要看到 `key` 命中，`type` 到 `ref/range/const`，并且 `rows` 明显下降。”

妹妹合上小本本，抱住哥哥胳膊：
“所以呀，兄长大人，优化 SQL 的本质不是玄学，是**让优化器选对路**。路选对了，延迟就会乖乖低头喵。”

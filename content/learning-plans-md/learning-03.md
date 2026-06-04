# MySQL 拷打 - 0602

> 本文整理 0602 这轮 MySQL 面试问答，重点覆盖索引、执行计划、隐式类型转换、ICP、排序优化等高频内容。
> 目标不是只背结论，而是能在面试里说清楚：为什么这样设计、什么时候会失效、生产里怎么取舍。

---

## 目录

- [1. InnoDB 索引为什么选择 B+ 树](#1-innodb-索引为什么选择-b-树)
- [2. 聚簇索引、非聚簇索引、回表、覆盖索引](#2-聚簇索引非聚簇索引回表覆盖索引)
- [3. 联合索引和最左前缀原则](#3-联合索引和最左前缀原则)
- [4. 常见索引失效或不走索引场景](#4-常见索引失效或不走索引场景)
- [5. LIKE 和函数导致索引失效](#5-like-和函数导致索引失效)
- [6. 隐式类型转换和索引使用](#6-隐式类型转换和索引使用)
- [7. 数字列和字符串常量比较的小陷阱](#7-数字列和字符串常量比较的小陷阱)
- [8. 索引下推 ICP](#8-索引下推-icp)
- [9. EXPLAIN 中 type 字段怎么看](#9-explain-中-type-字段怎么看)
- [10. EXPLAIN 常见字段和 Extra](#10-explain-常见字段和-extra)
- [11. 覆盖索引、排序和 limit 优化场景题](#11-覆盖索引排序和-limit-优化场景题)
- [12. 今日复盘重点](#12-今日复盘重点)

---

# 1. InnoDB 索引为什么选择 B+ 树

## 面试题

MySQL InnoDB 的索引为什么选择 B+ 树，而不是 Hash、红黑树或者 B 树？

## 标准答案

InnoDB 使用 B+ 树作为主要索引结构，核心原因是它非常适合磁盘存储场景，可以减少磁盘 IO，并且天然支持范围查询和排序。

B+ 树的非叶子节点只保存 key 和页指针，不保存完整行数据，所以一个 16KB 的页里可以放下更多 key。每个节点能保存更多 key，树的分叉就更多，树高就更低。实际生产中，即使有千万级数据，B+ 树通常也只有 3 到 4 层，查询一次数据需要访问的页数比较少。

B+ 树的叶子节点之间通过链表连接，所有数据都在叶子节点上。这样范围查询非常方便，比如：

```sql
select *
from user
where id between 100 and 200;
```

数据库只需要先定位到 `id = 100` 附近的叶子节点，然后顺着叶子节点链表向后扫描即可。

所以，B+ 树的主要优势可以总结为：

1. 树高低，磁盘 IO 少。
2. 非叶子节点只存 key 和指针，单页能容纳更多 key。
3. 叶子节点有序并通过链表连接，适合范围查询。
4. 所有数据都在叶子节点，查询路径更稳定。
5. 可以支持排序、范围查询、最左前缀匹配等数据库常见需求。

## 对比红黑树

红黑树本质上是自平衡二叉搜索树。二叉树每个节点最多只有两个子节点，数据量一大，树高就会明显增加。

数据库索引通常存在磁盘页中，访问一个节点往往意味着一次磁盘页访问。树越高，需要访问的页越多，磁盘 IO 成本越高。

所以红黑树适合内存中的有序结构，比如 Java 的 `TreeMap`、`TreeSet`，但不适合作为磁盘数据库的大规模索引结构。

## 对比 Hash

Hash 索引等值查询很快，比如：

```sql
where id = 100
```

但 Hash 不适合数据库通用索引，主要因为：

1. 不支持范围查询。
2. 不支持排序。
3. 不支持最左前缀匹配。
4. Hash 冲突需要额外处理。
5. 只能很好地处理等值查询。

例如下面这些查询，Hash 索引都不擅长：

```sql
where id > 100;
where name like '张%';
order by create_time;
```

注意：Hash 不适合作为 InnoDB 通用索引结构，原因不是“它不支持事务或崩溃恢复”。事务、崩溃恢复主要是存储引擎能力，不是 Hash 数据结构本身的核心缺陷。

## 对比 B 树

B 树和 B+ 树都属于多路平衡搜索树，但它们有重要区别：

| 对比点 | B 树 | B+ 树 |
|---|---|---|
| 数据存放位置 | 非叶子节点和叶子节点都可能存数据 | 数据只在叶子节点 |
| 非叶子节点容量 | 因为要存数据，能放的 key 更少 | 只存 key 和指针，能放更多 key |
| 树高 | 相对可能更高 | 更矮 |
| 范围查询 | 需要中序遍历，局部跳转更多 | 叶子链表顺序扫描 |
| 查询稳定性 | 可能在非叶子节点命中，路径不完全一致 | 最终都走到叶子节点 |

B 树不是不能用，而是 B+ 树更适合数据库索引这种磁盘页模型。

## 易错点

### 易错点 1：说“B+ 树叶子节点只存 key 和主键”

这个说法不完整。

在 InnoDB 中：

1. 如果是主键索引，也就是聚簇索引，叶子节点存的是整行数据。
2. 如果是普通索引，也就是二级索引，叶子节点存的是索引列和主键值。
3. 非叶子节点主要存 key 和页指针。

### 易错点 2：说 Hash 不行是因为事务和崩溃恢复

这个角度不对。Hash 不适合作为通用索引，主要是因为不能支持范围、排序和前缀匹配。

## 面试背诵版

> InnoDB 选择 B+ 树，核心是为了减少磁盘 IO。B+ 树的非叶子节点只保存 key 和页指针，一个 16KB 的页能容纳更多 key，所以树高很低，通常 3 到 4 层就能支持大量数据。并且 B+ 树叶子节点之间有链表，非常适合范围查询和排序。红黑树是二叉树，数据量大时树高太高；Hash 虽然等值查询快，但不支持范围查询、排序和最左前缀；B 树的非叶子节点也存数据，导致单页 key 更少，范围查询也不如 B+ 树方便。所以 InnoDB 更适合用 B+ 树作为索引结构。

---

# 2. 聚簇索引、非聚簇索引、回表、覆盖索引

## 面试题

聚簇索引和非聚簇索引有什么区别？什么是回表？什么是覆盖索引？

## 标准答案

在 InnoDB 中，主键索引通常就是聚簇索引。聚簇索引的叶子节点存放整行数据，所以通过主键查询时，可以直接在主键 B+ 树上找到完整记录。

非聚簇索引一般指二级索引，也就是普通索引、唯一索引、联合索引等非主键索引。二级索引的叶子节点不直接存整行数据，而是存索引列和主键值。

举例：

```sql
create table user (
    id bigint primary key,
    name varchar(64),
    age int,
    city varchar(64),
    index idx_name(name)
);
```

对于主键索引 `id`：

```text
主键索引叶子节点：id + 整行数据
```

对于二级索引 `idx_name(name)`：

```text
二级索引叶子节点：name + id
```

如果执行：

```sql
select *
from user
where name = '张三';
```

执行过程大概是：

1. 先走 `idx_name` 二级索引，找到 `name = '张三'` 对应的主键 `id`。
2. 再拿这个 `id` 去主键索引中查整行数据。

第二步就叫回表。

## 什么是回表

回表就是通过二级索引查到主键值后，再回到聚簇索引中查询完整行数据。

不是“回到表文件里随便找”，而是回到 InnoDB 的主键 B+ 树中查。

示例：

```sql
create index idx_name on user(name);

select age, city
from user
where name = '张三';
```

如果 `age`、`city` 不在 `idx_name` 索引中，则流程是：

```text
idx_name 二级索引 -> 找到主键 id -> 主键索引 -> 找到 age、city
```

## 什么是覆盖索引

覆盖索引不是一种新的索引类型，而是一种查询状态。

只要查询需要的字段都能从某个索引中直接拿到，不需要回表，就叫覆盖索引。

例如：

```sql
create index idx_name_age on user(name, age);

select id, name, age
from user
where name = '张三';
```

`idx_name_age` 这个二级索引中包含：

```text
name + age + 主键 id
```

查询字段刚好是：

```text
id, name, age
```

都能从二级索引中拿到，所以不需要回表。

此时 `EXPLAIN` 的 `Extra` 中可能出现：

```text
Using index
```

这通常表示使用了覆盖索引。

## 聚簇索引的选择规则

InnoDB 聚簇索引选择规则：

1. 如果有主键，主键就是聚簇索引。
2. 如果没有主键，选择第一个非空唯一索引作为聚簇索引。
3. 如果连非空唯一索引都没有，InnoDB 会生成一个隐藏的 6 字节 `row_id` 作为聚簇索引。

## 为什么推荐自增主键

推荐使用自增主键，主要原因是：

1. 自增主键递增插入，B+ 树通常在尾部追加。
2. 减少页分裂。
3. 减少数据移动。
4. 主键值更短，二级索引也更小。

如果使用 UUID 作为主键：

1. UUID 长度大，二级索引叶子节点也要存主键，索引体积变大。
2. UUID 无序插入，容易造成页分裂。
3. B+ 树维护成本更高。

## 面试背诵版

> InnoDB 中主键索引就是聚簇索引，叶子节点存放整行数据。一张表只能有一个聚簇索引。普通索引、联合索引属于二级索引，叶子节点存放索引列和主键值。通过二级索引查询时，如果查询字段不在索引里，需要先拿到主键值，再去主键索引中查整行数据，这个过程叫回表。如果查询字段都能从索引中直接拿到，不需要回表，就叫覆盖索引，`EXPLAIN` 里通常可以看到 `Using index`。

---

# 3. 联合索引和最左前缀原则

## 面试题

联合索引的最左前缀原则是什么？下面这个索引哪些 SQL 能用上？

```sql
create index idx_user_status_time on orders(user_id, status, create_time);
```

```sql
-- 1
select * from orders where user_id = 1;

-- 2
select * from orders where status = 1;

-- 3
select * from orders where user_id = 1 and status = 1;

-- 4
select * from orders where user_id = 1 and create_time > '2026-01-01';

-- 5
select * from orders where user_id = 1 and status > 1 and create_time > '2026-01-01';

-- 6
select * from orders where user_id = 1 order by create_time;
```

## 最左前缀原则

联合索引 `(a, b, c)` 的底层排序规则不是分别维护三棵树，而是按照多列组合排序：

```text
先按 a 排序
a 相同，再按 b 排序
b 相同，再按 c 排序
```

所以联合索引能高效使用的前提是从最左列开始连续匹配。

例如索引：

```sql
index(a, b, c)
```

可以较好使用：

```sql
where a = 1;
where a = 1 and b = 2;
where a = 1 and b = 2 and c = 3;
where a = 1 and b > 2;
```

不符合最左前缀：

```sql
where b = 2;
where c = 3;
where b = 2 and c = 3;
```

因为没有从最左列 `a` 开始。

## 范围查询的影响

联合索引中，等值匹配可以继续向右使用索引。

但是遇到范围查询后，范围列可以使用索引，范围列右边的列通常不能继续用于索引定位。

例如：

```sql
index(a, b, c)

where a = 1 and b > 10 and c = 3;
```

一般可以用到：

```text
a、b
```

但是 `c` 通常不能继续用于缩小索引扫描范围。

原因是：当 `b > 10` 时，`b` 已经是一个范围，范围内的记录再按 `c` 看，并不能形成一个全局连续可定位的区间。

## 逐条判断

### 1. `where user_id = 1`

```sql
select * from orders where user_id = 1;
```

可以使用联合索引。

命中了最左列 `user_id`，可以用到索引的第一列。

### 2. `where status = 1`

```sql
select * from orders where status = 1;
```

通常不能使用这个联合索引做高效定位。

原因是跳过了最左列 `user_id`，不符合最左前缀原则。

补充：MySQL 8.0 有一些场景可能出现 Index Skip Scan，但面试和常规优化中不要把它当成主要依赖。设计索引时仍然应该遵守最左前缀原则。

### 3. `where user_id = 1 and status = 1`

```sql
select * from orders
where user_id = 1 and status = 1;
```

可以使用联合索引。

可以用到：

```text
user_id + status
```

这是典型的从左到右连续等值匹配。

### 4. `where user_id = 1 and create_time > '2026-01-01'`

```sql
select * from orders
where user_id = 1 and create_time > '2026-01-01';
```

可以部分使用联合索引。

可以用到：

```text
user_id
```

但是 `create_time` 中间跳过了 `status`，所以它通常不能用于联合索引的连续定位。

不过，由于 `create_time` 本身也在联合索引里，MySQL 可能通过 ICP，也就是索引下推，在索引层做一部分过滤，减少回表。

### 5. `where user_id = 1 and status > 1 and create_time > '2026-01-01'`

```sql
select * from orders
where user_id = 1
  and status > 1
  and create_time > '2026-01-01';
```

可以部分使用联合索引。

一般可以用到：

```text
user_id + status
```

因为 `user_id` 是等值条件，`status` 是范围条件。

但是 `status` 之后的 `create_time` 通常不能继续用于索引定位。

`create_time` 可能作为 ICP 条件在索引层过滤，但这不等于它参与了联合索引范围定位。

### 6. `where user_id = 1 order by create_time`

```sql
select * from orders
where user_id = 1
order by create_time;
```

这个查询可以用 `user_id` 做过滤，但通常不能直接利用这个联合索引完成 `create_time` 排序。

原因是索引顺序是：

```text
user_id -> status -> create_time
```

当 `user_id = 1` 固定后，索引内部是先按 `status` 排序，再按 `create_time` 排序。

也就是说，整体顺序类似：

```text
status = 1, create_time = ...
status = 2, create_time = ...
status = 3, create_time = ...
```

这并不能保证全局按 `create_time` 有序。

所以 `order by create_time` 通常还需要额外排序，也就是可能出现：

```text
Using filesort
```

## 常见误区

### 误区 1：把“用到索引”和“用满联合索引”混为一谈

例如：

```sql
where user_id = 1 and create_time > '2026-01-01'
```

不能说“完全没用索引”。它至少可以用到 `user_id`。

更准确的说法是：

```text
能用到联合索引的最左列 user_id，但 create_time 因为跳过 status，不能继续用于联合索引定位。
```

### 误区 2：以为排序字段在索引里就一定不会 filesort

不对。

排序能不能用索引，要看：

1. 排序字段是否符合联合索引顺序。
2. 排序字段前面的列是否被等值固定。
3. 排序方向是否一致。
4. 是否混合升序降序，以及 MySQL 版本是否支持对应索引能力。

## 面试背诵版

> 联合索引遵循最左前缀原则。比如 `(a, b, c)`，索引整体按 `a` 排序，`a` 相同再按 `b`，`b` 相同再按 `c`。所以查询要从最左列开始连续匹配。等值条件可以继续向右使用索引，遇到范围查询后，范围列可以用索引，但范围列右边的列通常不能继续用于索引定位。如果跳过中间列，后面的列一般不能用于定位，但可能通过 ICP 在索引层过滤。

---

# 4. 常见索引失效或不走索引场景

## 面试题

什么情况下索引会失效？至少说 6 种，并解释为什么。

## 说明

严格说，“索引失效”这个词有点笼统。更准确地说，有些情况是：

1. 完全不能使用索引定位。
2. 只能使用联合索引的一部分。
3. 能扫索引，但效率不高。
4. 优化器判断全表扫描成本更低，所以放弃索引。

面试中可以统称为“索引失效或不走索引场景”，但解释时要分清。

## 1. 违反最左前缀原则

索引：

```sql
index(a, b, c)
```

查询：

```sql
where b = 1;
```

因为跳过了最左列 `a`，无法按联合索引的有序结构定位。

## 2. 范围查询右侧列无法继续用于索引定位

索引：

```sql
index(a, b, c)
```

查询：

```sql
where a = 1 and b > 10 and c = 3;
```

一般可以用到：

```text
a + b
```

但是 `c` 通常不能继续用于索引定位。

注意：这不是整个索引都失效，而是范围列右边的索引列不能继续参与定位。

## 3. 对索引列使用函数

```sql
where date(create_time) = '2026-06-02';
```

如果索引是：

```sql
index(create_time)
```

索引中保存的是原始 `create_time` 值，不是 `date(create_time)` 的结果。

对列做函数运算，相当于改变了索引列的比较形式，普通 B+ 树索引无法直接利用。

推荐改写：

```sql
where create_time >= '2026-06-02 00:00:00'
  and create_time <  '2026-06-03 00:00:00';
```

这样可以继续使用 `create_time` 的范围索引。

## 4. 对索引列使用表达式运算

```sql
where age + 1 = 18;
```

如果 `age` 上有索引，这种写法通常不能很好使用索引。

推荐改写为：

```sql
where age = 17;
```

原则是：不要在索引列上做计算，把计算挪到常量侧。

## 5. 字符串列发生隐式类型转换

字段：

```sql
phone varchar(20)
```

索引：

```sql
index(phone)
```

错误写法：

```sql
where phone = 13800138000;
```

因为 `phone` 是字符串列，右边是数字，MySQL 可能把 `phone` 列转换成数字再比较，类似：

```sql
where cast(phone as signed) = 13800138000;
```

这相当于对索引列做函数计算，可能导致索引失效。

正确写法：

```sql
where phone = '13800138000';
```

## 6. LIKE 左模糊

可以使用索引：

```sql
where name like '张%';
```

通常不能使用索引定位：

```sql
where name like '%张';
where name like '%张%';
```

B+ 树索引按从左到右的字符顺序排列，前缀确定时可以定位范围；左边不确定时无法确定扫描起点。

## 7. OR 条件中有一边不能走索引

```sql
where indexed_col = 1
   or no_index_col = 2;
```

如果 `no_index_col` 没有索引，优化器可能认为走索引意义不大，直接选择全表扫描。

优化方向：

1. 给两边条件都建立合适索引。
2. 改写为 `union` 或 `union all`，让每个子查询分别使用索引。
3. 根据数据分布判断是否真的需要优化。

## 8. 负向条件选择性差

```sql
where status != 1;
where status not in (1, 2);
```

这类条件不一定完全不能用索引，但通常选择性较差。

如果大部分数据都满足条件，走索引再大量回表，成本可能比全表扫描更高。

## 9. 优化器认为全表扫描成本更低

这是非常重要的面试加分点。

即使建立了索引，MySQL 也不一定会用。优化器会根据统计信息估算成本。

例如：

```sql
where status = 1;
```

如果 `status = 1` 的数据占全表 90%，走索引会查到大量主键，再大量回表。此时优化器可能认为直接全表扫描更便宜。

这种情况下不能简单说“索引失效”，更准确是“优化器基于成本选择了全表扫描”。

## 10. 索引区分度太低

字段值重复度很高，索引选择性就差。

例如：

```text
gender: 男/女
status: 0/1
deleted: 0/1
```

这种字段单独建索引不一定有效。更常见的做法是把它放进联合索引中，配合高区分度字段使用。

例如：

```sql
index(user_id, status, create_time)
```

其中 `user_id` 区分度高，`status` 用来进一步过滤，`create_time` 用来排序或范围查询。

## 面试背诵版

> 常见索引失效或不走索引的情况有：违反最左前缀原则、范围查询右侧列不能继续用于索引定位、对索引列使用函数或表达式、字符串字段发生隐式类型转换、`like` 左模糊、`or` 条件中有一边不能走索引、负向查询选择性差、索引区分度低，以及优化器认为全表扫描成本更低。核心原因是 B+ 树依赖有序性和高选择性，如果条件破坏了有序定位，或者回表成本太高，优化器就可能不走索引。

---

# 5. LIKE 和函数导致索引失效

## 面试题

```sql
create index idx_name on user(name);
```

下面三个条件哪个能走索引？为什么？

```sql
-- 1
where name like '张%';

-- 2
where name like '%张';

-- 3
where substring(name, 1, 1) = '张';
```

## 判断

### 1. `name like '张%'`

可以走索引。

原因是前缀确定，B+ 树可以定位到以“张”开头的第一个位置，然后向后扫描直到不满足前缀条件。

这个查询本质上可以理解为一个范围查询：

```text
name >= '张'
并且 name 小于某个不再以 张 开头的边界
```

具体边界由 MySQL 内部处理，不需要手写。

## 2. `name like '%张'`

通常不能走索引定位。

原因是左边不确定，B+ 树无法知道应该从哪里开始查。

如果要支持后缀匹配，可以考虑：

1. 反转字段单独存一列，例如 `reverse_name`。
2. 使用全文索引，适合文本检索场景。
3. 使用 Elasticsearch 等搜索引擎。
4. 小数据量直接扫描，避免过度设计。

## 3. `substring(name, 1, 1) = '张'`

普通索引通常不能使用。

原因是索引中保存的是原始 `name` 值，而查询条件对 `name` 做了函数运算。

这类似：

```sql
where 函数(name) = '张';
```

普通 B+ 树无法直接按函数结果定位。

## MySQL 8.0 的补充

MySQL 8.0 支持函数索引，也可以通过生成列配合索引优化函数查询。

例如：

```sql
alter table user
add column name_first varchar(8)
generated always as (substring(name, 1, 1)) stored,
add index idx_name_first(name_first);
```

然后查询：

```sql
where name_first = '张';
```

但是面试中默认语境通常是普通索引，所以仍然要回答：对索引列使用函数会导致普通索引无法直接使用。

## 面试背诵版

> `like '张%'` 可以走索引，因为前缀确定，B+ 树可以按前缀定位范围；`like '%张'` 和 `like '%张%'` 通常不能走索引，因为左边不确定，无法定位起点；`substring(name, 1, 1) = '张'` 一般也不能走普通索引，因为对索引列做了函数计算，索引中保存的是原始值，不是函数结果。

---

# 6. 隐式类型转换和索引使用

## 面试题

```sql
create index idx_phone on user(phone);
-- phone 是 varchar 类型
```

这两个 SQL 哪个更容易走索引？为什么？

```sql
-- 1
where phone = '13800138000';

-- 2
where phone = 13800138000;
```

## 标准答案

第一种更容易走索引：

```sql
where phone = '13800138000';
```

原因是 `phone` 是 `varchar` 类型，查询条件也是字符串，类型一致，可以按照索引中的字符串值进行查找。

第二种写法：

```sql
where phone = 13800138000;
```

右边是数字，左边是字符串列。MySQL 可能发生隐式类型转换，把 `phone` 列转换成数字再比较。

类似：

```sql
where cast(phone as signed) = 13800138000;
```

这相当于对索引列做了函数操作，可能导致普通索引无法用于定位。

## 为什么不是“破坏了索引结构”

索引结构本身没有被破坏。

真正的问题是：查询条件的比较方式让 MySQL 不能直接按照索引中保存的原始字符串值进行有序查找。

换句话说：

```text
索引还在，但当前 SQL 的写法让优化器难以使用它做高效定位。
```

## 生产建议

1. 字段是什么类型，SQL 参数就传什么类型。
2. 字符串字段比较时一定加引号。
3. Java 中 MyBatis、JPA、JDBC 参数绑定要保持类型一致。
4. 手机号、身份证号、订单号通常不要用数字类型，应该用字符串。

手机号不适合用数字类型的原因：

1. 不参与数学运算。
2. 可能有前导零。
3. 长度可能超过部分数字类型范围。
4. 本质是标识符，不是数值。

## 面试背诵版

> 如果 `phone` 是 `varchar`，`where phone = '13800138000'` 更容易走索引，因为类型一致。`where phone = 13800138000` 可能触发隐式类型转换，MySQL 可能把字符串列 `phone` 转成数字再比较，相当于对索引列做函数操作，普通索引就不能很好用于定位。所以开发中要保证字段类型和参数类型一致。

---

# 7. 数字列和字符串常量比较的小陷阱

## 面试题

```sql
create index idx_age on user(age);
-- age 是 int 类型
```

下面两个 SQL 哪个更可能不走索引？为什么？

```sql
-- 1
where age = '18';

-- 2
where age = 18;
```

## 标准答案

这题的陷阱是：如果 `age` 是 `int`，那么：

```sql
where age = '18';
```

通常仍然可以走索引。

原因是 MySQL 通常会把右边的字符串常量 `'18'` 转成数字 `18`，转换发生在常量侧，而不是索引列 `age` 上。

转换后类似：

```sql
where age = 18;
```

这不会破坏 `age` 索引的有序定位能力。

更规范的写法当然是：

```sql
where age = 18;
```

## 和 varchar 列比较的区别

危险的是这种：

```sql
phone varchar(20)

where phone = 13800138000;
```

这时 MySQL 可能把列 `phone` 转成数字比较，相当于：

```sql
where cast(phone as signed) = 13800138000;
```

转换发生在索引列侧，就可能导致索引失效。

## 判断原则

看隐式转换发生在哪里：

1. 如果转换发生在常量侧，一般不影响索引。
2. 如果转换发生在索引列侧，就可能导致索引不能用于定位。

## 面试背诵版

> 如果 `age` 是 int，`where age = '18'` 通常也可以走索引，因为 MySQL 会把字符串常量转换成数字，转换发生在常量侧，不影响索引列的有序性。但如果索引列是 varchar，却拿数字去比较，MySQL 可能把列转换成数字，相当于对索引列做函数操作，就可能导致索引失效。实际开发中仍然建议类型保持一致。

---

# 8. 索引下推 ICP

## 面试题

什么是索引下推 ICP？它解决了什么问题？

示例：

```sql
create index idx_name_age on user(name, age);

select *
from user
where name like '张%'
  and age = 18;
```

## ICP 是什么

ICP 全称是 Index Condition Pushdown，中文一般叫索引下推。

它的核心作用是：把一部分可以通过索引字段判断的条件下推到存储引擎层，在扫描索引时先过滤，减少回表次数。

## 没有 ICP 时

索引：

```sql
index(name, age)
```

查询：

```sql
where name like '张%' and age = 18;
```

由于 `name like '张%'` 是范围查询，`age` 通常不能继续用于联合索引定位。

没有 ICP 时，执行流程可能是：

1. 存储引擎根据 `name like '张%'` 扫描二级索引。
2. 对每条满足 `name` 范围的索引记录，都拿主键去回表。
3. Server 层拿到完整行后，再判断 `age = 18`。
4. 不满足 `age = 18` 的记录被丢弃。

问题是：会产生大量无意义回表。

## 有 ICP 时

因为 `age` 字段也在联合索引 `idx_name_age(name, age)` 中，所以即使它不能继续用于索引范围定位，也可以在索引扫描阶段先判断。

有 ICP 后，流程变成：

1. 存储引擎根据 `name like '张%'` 扫描二级索引。
2. 在索引层直接判断 `age = 18`。
3. 只有 `age = 18` 的记录才回表。
4. 减少回表次数。

## ICP 不能做什么

ICP 不能把范围查询后面的字段重新变成“可用于联合索引定位的字段”。

也就是说：

```sql
where name like '张%' and age = 18
```

`age` 在这里不是继续缩小 B+ 树扫描区间，而是在扫描出来的索引记录上做过滤。

所以要区分：

```text
索引定位：决定扫描范围从哪里开始，到哪里结束。
索引下推：扫描过程中用索引字段提前过滤。
```

## EXPLAIN 表现

使用 ICP 时，`EXPLAIN` 的 `Extra` 中可能出现：

```text
Using index condition
```

注意它和 `Using index` 不一样：

| Extra | 含义 |
|---|---|
| Using index | 覆盖索引，不需要回表 |
| Using index condition | 索引下推，在存储引擎层过滤索引条件 |

## 面试背诵版

> ICP 是索引下推，作用是把能通过索引字段判断的条件下推到存储引擎层，在扫描索引时先过滤，减少回表次数。比如联合索引 `(name, age)`，查询 `name like '张%' and age = 18`，`name` 是范围条件，`age` 通常不能继续用于索引定位，但因为 `age` 在索引里，所以可以通过 ICP 在索引层先判断 `age = 18`，满足条件的记录才回表。`EXPLAIN` 中通常表现为 `Using index condition`。

---

# 9. EXPLAIN 中 type 字段怎么看

## 面试题

看执行计划时，`type` 字段常见有哪些？从好到坏大概怎么排？

```text
system / const / eq_ref / ref / range / index / ALL
```

## 排序

从好到坏大致是：

```text
system > const > eq_ref > ref > range > index > ALL
```

注意：这个排序只是一般经验，不是绝对性能结论。最终还要结合 `rows`、`filtered`、`key`、`Extra`、数据量和 SQL 业务语义判断。

## system

`system` 是 `const` 的特殊情况，表示表中只有一行数据。

这种情况很少见，一般可以理解为最快访问类型之一。

## const

`const` 通常表示通过主键或唯一索引做等值查询，最多匹配一行。

例如：

```sql
select *
from user
where id = 1;
```

如果 `id` 是主键，那么结果最多一行，优化器可以把它当成常量处理。

## eq_ref

`eq_ref` 常见于多表 join。

含义是：对于前表的每一行，后表通过主键或唯一索引匹配，最多匹配一行。

例如：

```sql
select *
from orders o
join user u on o.user_id = u.id;
```

如果 `u.id` 是主键，那么对每个订单的 `user_id`，用户表最多匹配一行。

## ref

`ref` 表示使用普通索引进行等值查询，可能匹配多行。

例如：

```sql
create index idx_status on orders(status);

select *
from orders
where status = 1;
```

如果 `status` 不是唯一索引，`status = 1` 可能匹配很多行，所以是 `ref`。

注意：`ref` 不是覆盖索引。覆盖索引看 `Extra` 中的 `Using index`。

## range

`range` 表示索引范围扫描。

常见条件：

```sql
where id > 100;
where id between 100 and 200;
where create_time >= '2026-01-01';
where name like '张%';
```

范围扫描比等值查询通常更宽，但仍然可以利用索引定位范围。

## index

`index` 表示全索引扫描。

它会扫描整棵索引树，通常比 `ALL` 稍好，因为索引可能比整行数据更小。

但本质上仍然是全量扫描，不代表一定很快。

例如：

```sql
select name
from user;
```

如果 `name` 有索引，MySQL 可能直接扫描 `idx_name`，不扫整张表。

这时可能是 `index`。

## ALL

`ALL` 表示全表扫描。

通常是最差访问类型，尤其在大表中要警惕。

但小表 `ALL` 不一定有问题。比如一张配置表只有几十行，全表扫描可能比走索引还便宜。

## 面试背诵版

> `type` 表示访问类型，常见从好到坏是 `system > const > eq_ref > ref > range > index > ALL`。`const` 一般是主键或唯一索引等值查询，最多一行；`eq_ref` 常见于 join 中通过主键或唯一索引关联；`ref` 是普通索引等值查询，可能多行；`range` 是范围扫描；`index` 是全索引扫描；`ALL` 是全表扫描。`type` 不是唯一性能指标，还要结合 `rows`、`key`、`Extra` 和数据量判断。

---

# 10. EXPLAIN 常见字段和 Extra

## 面试题

`EXPLAIN` 里 `possible_keys`、`key`、`key_len`、`rows`、`Extra` 分别怎么看？

尤其是：

```text
Using index
Using index condition
Using filesort
Using temporary
```

各代表什么？

## possible_keys

`possible_keys` 表示优化器认为当前 SQL 可能使用到的索引。

它不代表最终一定使用这些索引。

如果这里是 `NULL`，说明优化器没有找到可用索引，或者认为没有合适索引。

## key

`key` 表示最终实际选择的索引。

如果 `key` 是 `NULL`，说明没有使用索引。

注意：`possible_keys` 有值但 `key` 为 `NULL` 是可能的，说明优化器虽然认为有候选索引，但最终估算成本后没有选择它。

## key_len

`key_len` 表示 MySQL 实际使用索引的长度。

它可以辅助判断联合索引用到了几列。

例如联合索引：

```sql
index(a, b, c)
```

如果 `key_len` 只对应 `a` 的长度，说明可能只用到了第一列。

如果对应 `a + b`，说明可能用到了两列。

注意：`key_len` 会受字段类型、字符集、是否允许 `NULL`、变长字段长度字节影响。

## rows

`rows` 表示优化器估算需要扫描的行数。

它不是准确结果，而是根据统计信息估算出来的。

一般来说，`rows` 越大，查询风险越高，但还要结合 `filtered` 和实际返回行数判断。

## filtered

`filtered` 表示经过条件过滤后，预计剩余记录的比例。

例如：

```text
rows = 10000
filtered = 10.00
```

大概表示扫描 10000 行，其中预计 10% 满足条件，也就是约 1000 行。

## Extra

`Extra` 展示额外执行信息，是定位 SQL 性能问题非常重要的字段。

### Using index

`Using index` 通常表示覆盖索引。

也就是查询需要的字段都能从索引中拿到，不需要回表。

示例：

```sql
create index idx_user_time on orders(user_id, create_time);

select user_id, create_time
from orders
where user_id = 100;
```

如果查询字段都在索引中，就可能出现 `Using index`。

### Using index condition

`Using index condition` 表示索引下推 ICP。

它代表 MySQL 会在存储引擎层使用索引字段先过滤，减少回表。

注意：

```text
Using index          = 覆盖索引，通常不回表
Using index condition = 索引下推，通常仍可能回表，只是减少回表
```

### Using filesort

`Using filesort` 表示 MySQL 不能直接利用索引顺序完成排序，需要额外排序。

注意：名字里有 `file`，但不代表一定落磁盘文件。它可能在内存中排序，也可能因为数据量太大使用磁盘临时文件。

常见触发原因：

1. `order by` 字段没有合适索引。
2. `order by` 顺序和联合索引顺序不匹配。
3. 联合索引中排序字段前面的列没有被等值固定。
4. 排序方向复杂，索引无法直接满足。

### Using temporary

`Using temporary` 表示使用了临时表。

常见场景：

1. `group by`
2. `distinct`
3. 复杂 `order by`
4. 派生表
5. 部分 union 查询

它不一定代表一定很慢，但如果数据量很大，就要重点关注。

## Extra 里的几个对比

| Extra | 含义 | 是否一定坏 |
|---|---|---|
| Using index | 覆盖索引，不回表 | 通常是好事 |
| Using index condition | ICP，索引层过滤 | 通常是优化 |
| Using where | Server 层还有条件过滤 | 正常现象，不一定坏 |
| Using filesort | 额外排序 | 大数据量要警惕 |
| Using temporary | 使用临时表 | 大数据量要警惕 |

## 面试背诵版

> `possible_keys` 是可能使用的索引，`key` 是实际选择的索引，`key_len` 可以辅助判断索引用到了多长，常用于分析联合索引用到几列，`rows` 是预计扫描行数，`Extra` 是额外执行信息。`Using index` 表示覆盖索引，不需要回表；`Using index condition` 表示索引下推，在索引层先过滤；`Using filesort` 表示不能利用索引顺序完成排序，需要额外排序；`Using temporary` 表示使用临时表，常见于分组、去重、复杂排序等场景。

---

# 11. 覆盖索引、排序和 limit 优化场景题

## 面试题

```sql
create index idx_user_time on orders(user_id, create_time);

select id, user_id, create_time
from orders
where user_id = 100
order by create_time desc
limit 10;
```

这个 SQL 可能走什么索引？会不会回表？会不会 filesort？为什么？

## 标准答案

这个 SQL 大概率会走联合索引：

```sql
idx_user_time(user_id, create_time)
```

原因是：

1. `where user_id = 100` 命中联合索引最左列。
2. 在 `user_id` 固定后，索引内部按 `create_time` 有序。
3. `order by create_time desc` 可以通过反向扫描索引完成。
4. `limit 10` 可以让 MySQL 找到前 10 条后尽快停止扫描。

## 会不会回表

一般不需要回表。

因为 InnoDB 二级索引叶子节点中保存：

```text
user_id + create_time + 主键 id
```

查询字段是：

```sql
id, user_id, create_time
```

这些字段都在二级索引中能拿到，因此形成覆盖索引。

`EXPLAIN` 的 `Extra` 中可能出现：

```text
Using index
```

表示不需要回表。

## 会不会 filesort

一般不需要 `filesort`。

因为索引顺序是：

```text
user_id -> create_time
```

当 `user_id = 100` 被等值固定后，满足条件的数据在索引中已经按 `create_time` 排好序。

`order by create_time desc` 可以通过反向扫描索引得到结果。

## 为什么 limit 10 很关键

如果索引能同时满足过滤和排序：

```sql
where user_id = 100
order by create_time desc
limit 10
```

MySQL 可以沿着索引顺序扫描，找到 10 条就停止。

这比先查出大量数据再排序，然后取前 10 条要高效很多。

## 什么时候可能出现 filesort

### 1. 索引列顺序不匹配

如果索引是：

```sql
index(create_time, user_id)
```

这个查询不一定理想。

因为条件是：

```sql
where user_id = 100
order by create_time desc
```

`user_id` 不是最左列，无法高效定位某个用户的数据。

### 2. 中间跳过索引列

如果索引是：

```sql
index(user_id, status, create_time)
```

查询是：

```sql
where user_id = 100
order by create_time desc
```

因为中间跳过了 `status`，在 `user_id` 固定后，索引内部是先按 `status` 排序，再按 `create_time` 排序。

整体不能保证按 `create_time` 有序，所以可能需要 `filesort`。

### 3. 查询字段不被索引覆盖

如果查询：

```sql
select id, user_id, create_time, amount, address
from orders
where user_id = 100
order by create_time desc
limit 10;
```

如果 `amount`、`address` 不在索引中，就需要回表。

不过是否需要 `filesort` 和是否回表是两个问题：

1. 回表是为了拿字段。
2. filesort 是因为不能利用索引顺序排序。

有回表不一定有 filesort，有 filesort 也不一定回表。

## 面试背诵版

> 这个 SQL 大概率走 `(user_id, create_time)` 联合索引。`user_id = 100` 命中最左列，在 `user_id` 固定后，索引内部按 `create_time` 有序，所以 `order by create_time desc` 可以通过反向扫描索引完成，一般不需要 `filesort`。查询字段是 `id、user_id、create_time`，而 InnoDB 二级索引叶子节点包含索引列和主键 id，所以字段都在索引中，形成覆盖索引，一般不需要回表。这里要注意，不是排序字段在索引里就一定没有 filesort，而是排序字段顺序要和联合索引顺序匹配，并且前面的索引列要被等值固定。

---

# 12. 今日复盘重点

## 已经掌握得比较好的点

1. 知道 B+ 树相比红黑树、Hash、B 树的核心优势。
2. 能说明聚簇索引、二级索引、回表、覆盖索引的基本关系。
3. 能判断 `like '张%'`、`like '%张'`、函数查询对索引的影响。
4. 能理解字符串列和数字比较时，隐式转换可能导致索引失效。
5. 能说出 `Using index` 和 `Using index condition` 的区别。
6. 能判断 `(user_id, create_time)` 对过滤、排序和 `limit` 的优化价值。

## 需要继续强化的点

### 1. “用到索引”和“用满索引”要分开说

例如：

```sql
index(user_id, status, create_time)

where user_id = 1 and create_time > '2026-01-01'
```

不能简单说“不走索引”。

准确说法：

```text
可以用到 user_id，但因为跳过 status，create_time 不能用于联合索引连续定位，可能通过 ICP 过滤。
```

### 2. 范围查询右侧列的表达要严谨

例如：

```sql
where a = 1 and b > 10 and c = 3
```

准确说法：

```text
a 和 b 可以用于索引定位，c 通常不能继续用于定位，但如果 c 在索引里，可能通过 ICP 做索引层过滤。
```

### 3. `Using filesort` 的含义不能说反

`Using filesort` 不是“使用索引排序”，而是：

```text
不能直接利用索引顺序完成排序，需要额外排序。
```

### 4. `ref` 不是覆盖索引

`ref` 是 `EXPLAIN.type` 中的一种访问类型，表示普通索引等值查询，可能匹配多行。

覆盖索引看 `Extra`：

```text
Using index
```

### 5. Hash 索引的核心缺点要说准

Hash 不适合作为通用索引，核心不是事务或崩溃恢复，而是：

1. 不支持范围查询。
2. 不支持排序。
3. 不支持最左前缀。
4. 只适合等值查询。

## 最后速背版

### B+ 树

> B+ 树非叶子节点只存 key 和指针，单页能存更多 key，树更矮，磁盘 IO 更少；叶子节点链表相连，适合范围查询和排序。

### 回表

> 二级索引叶子节点存索引列和主键值。如果查询字段不在二级索引中，就要拿主键回到聚簇索引查整行，这叫回表。

### 覆盖索引

> 查询字段都能从索引中拿到，不需要回表，就叫覆盖索引，`Extra` 常见 `Using index`。

### 最左前缀

> 联合索引要从最左列开始连续匹配，等值条件可以继续向右，遇到范围查询后，右边列通常不能继续用于索引定位。

### ICP

> ICP 是索引下推，把能通过索引字段判断的条件下推到存储引擎层，在索引扫描阶段先过滤，减少回表。`Extra` 常见 `Using index condition`。

### EXPLAIN type

```text
system > const > eq_ref > ref > range > index > ALL
```

### Extra

```text
Using index           覆盖索引
Using index condition ICP 索引下推
Using filesort        额外排序
Using temporary       使用临时表
```

### 隐式转换

> 字符串列和数字比较时，MySQL 可能把列转成数字，相当于对索引列做函数，导致索引失效。数字列和字符串常量比较时，通常是常量转数字，一般还能走索引。


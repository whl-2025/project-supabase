

## 1) Supabase 是啥（平台定位）

- 一句话：Supabase 就是“现成的后端服务”，帮你省掉自己搭数据库、写接口、做登录、做文件存储这些重复活。
- 和 Firebase 很像，但 Supabase 完全开源、用的是大名鼎鼎的 PostgreSQL（关系型数据库），可自托管，数据可控。
- 你可以把它理解成：给前端装的“后端工具箱”，开箱就能用。

关键词翻译：
- 开源：代码公开透明，能自托管，不被厂商锁死。
- BaaS（Backend as a Service）：把后端当服务用，不自己养服务器。

---

## 2) 技术架构（底层怎么拼起来的）

你可以把 Supabase 想成一栋楼：
- 门口的保安（Kong 网关）：统一入口，负责“门禁”和“分配到哪个服务”。
- 大楼里的部门：
  - Postgres（数据库）：放数据的“仓库”，可靠、强大、会写 SQL 就能查。
  - PostgREST（REST 接口）：自动把数据库变成 HTTP 接口，省掉写大量 CRUD。
  - GoTrue（认证登录）：管注册/登录/发令牌（JWT）。
  - Realtime（实时）：监听数据库变化，像“消息广播站”。
  - Storage（存储）：存文件的地方，像“网盘”，但权限跟数据库打通。
  - pg_graphql（GraphQL）：给喜欢 GraphQL 的人自动生成查询层。
  - postgres-meta（DB 管理 API）：通过接口管理数据库对象。

名词直译：
- Kong：API 网关，像物业前台；
- REST API：用 URL 调数据；
- GraphQL：前端自选字段的查询方式；
- JWT：登录后发的“通行证”；
- WebSocket：持久连接，适合实时。

---

## 3) 核心功能（能直接拿来用的）

- 数据库（Postgres）：稳定、强大、会 SQL 就能玩转。支持行级权限（RLS）。
- 自动 API：
  - REST（PostgREST）：数据库表一建，接口就有了；
  - GraphQL（pg_graphql）：想要 GraphQL 也能开。
- 认证登录（GoTrue）：邮箱/密码、OAuth（Google/GitHub 等）、魔法链接等。
- 实时（Realtime）：数据库一改，前端立刻收到变化。
- 文件存储（Storage）：存图片/视频/文档，权限和用户、数据表打通。
- 边缘函数（Edge Functions）：写点后端逻辑，跑在边缘节点，延迟低。
- AI/向量（pgvector）：做语义搜索、推荐，可以把文本/图片的向量塞进数据库。

几个容易混淆的词：
- RLS（Row Level Security，行级安全）：在数据库里就把“谁能看哪一行”定死，安全又省心。
- Anon Key / Service Role Key：前端用的“游客钥匙”（权限受限） vs 服务器用的“管理员钥匙”（高权限，别泄露）。

---

## 4) 平台对比（为啥不是 Firebase/AWS Amplify/Hasura）

- 和 Firebase 比：
  - Supabase 用 SQL（可预测、强关系），开源可自托管；
  - Firebase 用 NoSQL（文档型），闭源托管为主。
- 和 AWS Amplify 比：
  - Supabase 一体化、上手简单；
  - Amplify 组件多、自由度大但学习成本高。
- 和 Hasura 比：
  - Supabase 是“后端全家桶”；
  - Hasura 主打 GraphQL 引擎，其他能力要自己拼。

一句话：你要“又快又稳又可控”，Supabase 很合适。

---

## 5) 实战怎么落地（我现在要做一个小应用）

最小闭环步骤：
1. 建表 + 权限（RLS）：谁的数据谁看。
2. 开登录：邮箱密码/OAuth 随你选。
3. 装前端 SDK：一行初始化，立刻能查数据。
4. 要实时？订阅一下表变化就行。
5. 要业务逻辑？写一个 Edge Function。

极简示例（思路，不用全部念）：
```sql
-- 建表
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table projects enable row level security;
create policy "owner can read" on projects for select using (auth.uid() = owner_id);
create policy "owner can write" on projects for insert with check (auth.uid() = owner_id);
```

---

## 6) 适用场景（四类就够）

1) 快速原型/MVP：零后端、自动 API、1 周出结果。
2) 全栈 Web（含移动端）：认证 + 实时 + 存储，SDK 覆盖 iOS/Android，支持离线。
3) 实时协作/聊天：订阅数据库变更，毫秒级同步。
4) 企业自托管：数据可控、合规，接 SSO/OAuth，方便扩展。

---

## 名词小词典（演讲时随用随查）

- Postgres：老牌关系型数据库，会 SQL 就能干活。
- RLS（行级安全）：把“谁能看哪一行”写进数据库的规则里。
- REST：用 URL + 方法（GET/POST）访问数据的老牌方式。
- GraphQL：前端自选字段，一次拿到刚好需要的数据。
- JWT：登录后拿到的令牌，相当于“通行证”。
- Realtime：数据库有变化，秒推到客户端。
- Storage：文件存储，和权限打通。
- Edge Functions：跑在边缘的函数，写少量后端逻辑。
- pgvector：存放“向量”的扩展，做语义搜索/推荐。
- Kong：API 网关，像物业/前台，管入口和路由。
- Anon Key：前端用的“游客钥匙”，权限受限。
- Service Role Key：服务器用“管理员钥匙”，别放到前端。

---

## 常见问题（Q&A）

- Q：我只会前端，能用吗？
  - A：能。装 SDK、填 URL 和 Key，数据就能查；复杂逻辑慢慢加。
- Q：我有隐私/合规要求？
  - A：自托管就行，数据在你自己的服务器，配 SSO/OAuth。
- Q：和 Firebase 选谁？
  - A：偏 SQL、重合规、要自托管 → Supabase。偏 NoSQL、完全托管 → Firebase。

---

## 总结

- Supabase = 开箱即用的“后端全家桶”，开源、可控、上手快。
- 用 SQL 的同学会非常舒服；不懂后端也能迅速做出能跑的产品。
- 小到演示/MVP，大到企业自托管，都能覆盖。

> 如果你今天只记住一句话：用 Supabase，别再从零搭后端。



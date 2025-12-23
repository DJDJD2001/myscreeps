# 已实装

## creep身材、数量管理

每个房间memory中保存该房间的creep各role的身材和数量。

每200tick，会重新对每个房间的creep按照role进行自动的数量、身材计算。

身材计算是按照当前可用的spawn+extension，生成尽可能大的creep（每个role具体配置不同）

数量上，其他role基本固定，其中pioneer和harvest是根据source数量、work数量和source外围空间来综合计算的

根据房间建设进度（主要是用于分离物流所必需的container和可用extension），大体分以下几个阶段：

1. energy不到750（生不起可以拉满单source的harvest）且container没修完：完全由pioneer完成工作
2. 否则：分成harvester、carrier、builder、upgrader完成工作

## 生产队列

每个房间memory中维护一生产队列，存储name、body、opts，每个tick，房间内所有spawn会读取生产队列并尝试生产

每tick，读取Game.creeps，按照role和房间统计现有creep，如果比需求数量少，则push进list

# 计划中

| HoP的bot中，storage建成后，carrier分成container-storage和storage-extension两个角色；link建成后，使用带CARRY的harvester，放弃container，挖完传到link中，再由link发回centerlink

| 
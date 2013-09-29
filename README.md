## nbselect
* 版本：1.0
* 教程：[http://gallery.kissyui.com/nbselect/1.0/guide/index.html](http://gallery.kissyui.com/nbselect/1.0/guide/index.html)
* demo：[http://gallery.kissyui.com/nbselect/1.0/demo/index.html](http://gallery.kissyui.com/nbselect/1.0/demo/index.html)

一箇多層樹狀的選擇框，由樹狀數據結構進行維護，已經在淘寶網Item頁面中使用。已覆蓋一定業務場景。
使用較爲靜態的編碼方式編寫數據模型類，自帶一箇人機交互界面，使用較爲鬆散的編碼方式進行編碼。如若遇到不同場景，請直接繼承模型類實現所期界面。

## 由一个数状结构驱动，格式如下
     node = {
        name : "节点名",
        childLevelName : "childs层级的层级名",
        firstPinyin : "可以显示个拼音索引,没有就不显示",
        childs:[ node,node,node........ ] //childs可又可无
     }

## 方法列表
待补全，其实很简单直接看Demo就行了。

## changelog

### V1.0
建立项目



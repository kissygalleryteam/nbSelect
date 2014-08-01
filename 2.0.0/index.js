/**
 * @fileoverview 
 * @author 九十<wongguang.wg@alibaba-inc.com>
 * @module nbSelect
 **/
KISSY.add(function(S, XTemplate, DOM, Kscroll){
    
    /* Class AutoModel
     * 为需求编写模型，基本是个不平衡多叉树
     * 使用下面的数据结构
     * node = {
     *    _id : 模型自动打上去的，用guid产生
     *    pid : 模型自动打上去的，父节点的_id
     *    啥量都能出现在这里个obj里
     *    childsL:[node , node........]
     * }
     * */
    function AutoModel(config){
        var self = this;
        S.mix(self, {
            
            domain          : "l_" + S.guid(),

            config          : config,
            
            _data           : null,
            _dataHash       : {},
            _curNode        : null

        }); 
        self.loadData(self.config.data);
        self.init();
    }
    S.mix(AutoModel.prototype, {
        
        /* setCurNode
         * 更新游标
         * P node 目标node
         * P firstTime 初见，初始化阶段不去调用细粒度诉求方法
         * */
        setCurNode  : function(node, firstTime){
            var self = this;
            self._curNode = node;
            if(!firstTime){
                self.ui_setCurNode(node);
            }
        },
        
        getNodes    : function(){
            var self = this;
            return self._dataHash;
        },

        /* getCurNode
         * 获取游标
         * RET node
         * */
        getCurNode  : function(){
            var self = this;
            return self._curNode;
        },
        
        /* getParents
         * 通过一个Node获得所有的祖先
         * RET Array
         * */
        getParents  : function(node){
            var self = this;
            var ret = [];
            var cur = node;
            while( cur._pid && (cur = self._dataHash[cur._pid]) ){
                ret.push(cur);
            }
            return ret;
        },

        /* getNodePath
         * 获取一个元素的正向的路径（包含元素自身）
         * P node
         * RET Array
         * */
        getNodePath : function(node){
            var self    = this;
            var ret     = null;
            ret = self.getParents(node);
            ret.reverse();
            ret.push(node);
            return ret;
        },
        
        /* inNodePath
         * 元素之间的包含关系
         * P node1
         * P node2
         * RET Boolean
         * */
        inNodePath  : function(node1, node2){
            var self    = this;
            var nodePath= self.getNodePath(node2);
            return S.inArray(node1, nodePath);
        },
        
        /* getRoot
         * 获取根节点
         * RET Node
         * */
        getRoot     : function(){
            var self    = this;
            return self._data;
        },
        
        /* getNode
         * 根据guid产生的运行环境唯一的ID获取Node
         * P id
         * RET Node
         * */
        getNode     : function(id){
            var self = this;
            return self._dataHash[id];
        },

        /* isLastLevel
         * 判断Node是否时最后一级
         * P Node
         * RET Boolean
         * */
        isLastLevel : function(node){
            var self = this;

            if(node.childs){
                for(var i = 0, len = node.childs.length; i < len ; i++){
                    if(node.childs[i].childs){
                        return false;
                    }
                }
            }
            
            return true;

        },
        /* loadData
         * 装填数据，并且用guid make一个_id
         * P 此模型使用的结构化数据
         * */
        loadData    : function(data){
            var self    = this;
            var nbData  = S.clone(data);

            function markID(d, pid){

                var id  = S.guid(); //var id  = S.guid()|0; 别纠结类型
                d._id = id;
                self._dataHash[id] = d; //save 2 hash table

                if(pid){
                    d._pid = pid;
                }

                if(d.childs){
                    for(var i = 0, len = d.childs.length; i<len; i++){
                        markID(d.childs[i], id);
                    }
                }

            }

            markID(nbData);
            self._data  = nbData;
            
        },

        /* reset 模型方法 重置模型
         * */
        reset       : function(){
            var self = this;
            self.setCurNode(null, true);
            self.ui_reset();
        },
        
        /* init
         * 初始化方法，主要是鞭打细粒度实现类进行初始化
         * */
        init        : function(){
            var self    = this;
            self.ui_init();
        },
        
        //这些是细粒度类要实现的= =
        ui_init         : adv_wish('ui_init'),
        ui_setCurNode   : adv_wish('ui_setCurNode'),
        ui_reset        : adv_wish('ui_setCurNode')
    });

    
    /* Class Auto
     * 多级级联的人机界面实现，从AutoModel继承并且实现其诉求的细粒度方法
     * */
    var Auto = S.extend(function(config){//从模型类上扩展，所以父类写在第二参数看起来就是这么蛋疼

        var self        = this;
        var prefix      = config.prefix;
        var noArrow     = config.noArrow;
        var $trigger    = S.all(config.trigger);
        var cols        = []; //根据等级保存
        var tmpl        = [].join('');
        var $set        = S.all('<div class="'+prefix+'-popup-set"></div>');
        var tpl_col     = '<ul>'+
            '{{#each childs}}'+
                '<li data-nodeID="{{_id}}" class="li-id-{{_id}}" ><span class="tb-icon-pinyin" >{{firstPinyin}}</span><a href="#">{{name}}<i></i>' + ( noArrow ? "" : '<span class="'+prefix+'-arr" ></span>' ) + '</a></li>' +
            '{{/each}}'+
            '</ul>';

        var pop, inited = false; //在第一次SHOW时初始化POP
        var lastPick; //在refresh时进行记录，在界面pick信号来到时使用去重

        /* syncKScrStatus
         * 同步滚动条展示与否的属性
         * */
        function syncKScrStatus($col){
            $col.all('.'+prefix+'-popup-container').css('overflow', 'visible');
            if( $col.all('.'+prefix+'-popup-scrollbar').css('display') !== 'none' ) {
                $col.addClass(prefix+'-col-has-scr');
            }else{
                $col.removeClass(prefix+'-col-has-scr');
            }
        }
        
        /* refresh
         * 内部方法，使用模型数据对界面进行刷新
         * */
        function refresh(pickedNode){

            var curNode = pickedNode || self.getCurNode(), path;
            var node, $col, wannaSelect, needDomRefresh;

            if(!curNode){
                path    = [self.getRoot()];
            }else{
                path    = self.getNodePath(curNode);
            }

            lastPick = curNode;

            for(var i = 0, pathLen = path.length, len = Math.max(pathLen, cols.length); i < len; i++){
                
                if( i < pathLen && path[i].childs){

                    node = path[i];

                    if(node.childs){ //创建子选择列表

                        if(!cols[i]){

                            $col = S.all(
                                '<div style="display:none" class="'+prefix+'-popup-col '+prefix+'-popup-lv-'+
                                (i+1)+'" ><h5>{{childLevelName}}</h5><div class="'+prefix+'-popup-inner tb-clearfix"></div></div>');
                            
                            cols[i] = $col;
                            
                            (function($col){
                                setTimeout(function(){
                                    var kscr = new Kscroll(
                                        $col.all('.'+prefix+'-popup-inner'),
                                        {
                                            prefix: prefix + '-popup-',
                                            hotkey: true,
                                            bodydrag: false,
                                            allowArrow: true
                                        }
                                    );
                                    $col.data('kscr', kscr); //懒得看KSCR有没有自己有没有存了，但是因为这里是异步的后面的resize得加个恶心的if
                                    $col.all('.'+prefix+'-popup-container').attr("hidefocus", "on"); //IE上有虚线，因为有tabIndex

                                    $col.all('.'+prefix+'-popup-container').append($col.all('h5')).siblings('h5').remove();
                                    syncKScrStatus($col, 100); //之后顺序执行
                                });
                            })($col);

                            $set.append($col); //这么写最方便
                        }
                        
                        $col = cols[i];
                        needDomRefresh = $col.data('lv_id') != node._id;

                        if( needDomRefresh ){ 
                            var sucksNode = S.mix({"firstPinyin":undefined}, node, false); //有穿透的问题那个xtpl不太会用其实。。
                            var html = new XTemplate(tpl_col).render(sucksNode);
                            $col.all('.'+prefix+'-popup-inner').html(html);
                            $col.all('h5').text(node.childLevelName);
                        }else{
                            $col.all(".selected").removeClass('selected');
                        }

                        if( self.isLastLevel(node) ){ //增加叶子的特殊样式
                            $col.addClass(prefix+"-popup-col-leaf");
                        }else{
                            $col.removeClass(prefix+"-popup-col-leaf");
                        }

                        wannaSelect = path[i+1]; //选中
                        if(wannaSelect){
                            $col.all(".li-id-"+wannaSelect._id).addClass('selected');
                        }

                        $col.show();
                        
                        var kscr=$col.data('kscr');
                        if( needDomRefresh && kscr){
                            kscr.resize();
                            kscr.scrollByPercent(0);
                            syncKScrStatus($col);
                        }

                        $col.data('lv_id', node._id);

                    }

                }else if( $col = cols[i] ){
                    $col.hide();
                }

            }
        }
        
        /* show
         * 内部方法，展示界面，会在第一次展示的时候进行pop的初始化和行为触发事件的移交
         * */
        function show(){

            if (!inited) {

                $trigger.detach('click', show);
                S.use('overlay', function(S, Overlay) {
                    
                    pop = new Overlay.Popup({
                        trigger : $trigger, 
                        elCls   : prefix+'-popup',
                        content : $set,
                        toggle  : true
                    });
                    
                    function ev4doc_mousedown(e){
                        if( !DOM.contains($set, e.target) && !DOM.contains($trigger, e.target) ){ //Parent就他一个Child问题不大
                            pop.hide();
                        }
                    }
                    
                    pop.on('beforeVisibleChange', function(e){
                        if(e.newVal){ // true 是显示，这个事件实现搓死了。。
                            pop.align($trigger, ['bl', 'tl'], [-2, 0]);
                        }
                    });

                    pop.on('show', function(ev) {
                        refresh();
                        DOM.addClass($trigger, prefix+'-drop');
                        DOM.removeClass($trigger, prefix+'-selected'); // 移除小三角
                        S.all(document.body).on('mousedown', ev4doc_mousedown);
                    });

                    pop.on('hide', function(ev) {
                        DOM.removeClass($trigger, prefix+'-drop');
                        S.all(document.body).detach('mousedown', ev4doc_mousedown);
                    });
                    
                    refresh();
                    pop.render();
                    pop.show();
                    inited = false;

                });
            }
        }
        
        //{ 初始界面行为关联
        $trigger.on('click', show);
        $set.delegate("click" ,'li', function(e){
            e.preventDefault();
            var $currentTarget  = S.all(e.currentTarget);
            var nodeID          = $currentTarget.attr('data-nodeid')|0;
            var node            = self.getNode(nodeID);
            
            if(lastPick && node.childs && self.inNodePath(node, lastPick)){ //叶子节点永远都能进入judgeWindow的临界区
                return;
            }

            refresh(node); //刷新根据给定Node
            
            self.config.ev_afterPickedNode.call(self,node, function(curNode){ //异步判定窗口，可以使用AJAX等异步方法进行判定，也可同步判定
                if(curNode){
                    self.setCurNode(curNode);
                }
            });
            
        });
        //}

        self.ui_setCurNode  = function(node){
            pop && pop.hide();
            self.config.ev_afterSetCurNode(node);
        };

        self.ui_reset       = function(){
            refresh();
        };

        self.ui_init        = function(){};

        AutoModel.apply(self, arguments);

    }, AutoModel);

    
    ///* 模型小助手 adv_wish
    // * 模型类诉求细粒度业务对接方法的嚎叫产生器
    // * */
    function adv_wish(methodName){
        return function(){
            console.log('未实现的方法：' + methodName);
        }
    }
    return Auto;
    

}, 
{
    requires: [
        "xtemplate",
        "dom",
        "./plugin/kscroll"
    ]
});

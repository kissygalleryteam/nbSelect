/*
combined files : 

1.0/plugin/kscroll
1.0/index

*/
/*
combined files : 

gallery/kscroll/1.2/index

*/
/**
 * @fileoverview 基于KISSY的滚动条组件。支持滚轮、拖拽、上下箭头加速滚动。样式可定制，支持hover,active两种状态。自适应内容区大小调整。
 * @author satans17<satans17@gmail.com>
 * @module kscroll
 **/
KISSY.add('1.0/plugin/kscroll',function (S, Node,Base) {
    var $ = Node.all,

        //正数
        toPositive = function (n) {
            return n < 0 ? -n : n;
        },

        toInt = function(n){
            return isNaN(parseInt(n))?0:parseInt(n);
        },
		
		capitalFirst = function(s) {
			return s.charAt(0).toUpperCase() + s.substring(1);
		},

        SCROLL_HTML = '<div class="{prefix}scrollbar"><div class="{prefix}track" ' +
            '>' +
            '<div class="{prefix}drag" ' +
            '>' +
            '<div class="{prefix}dragtop">' +
            '</div><div class="{prefix}dragbottom"></div>' +
            '<div class="{prefix}dragcenter"></div>' +
            '</div>' +
            '</div></div>',

        ARROW = '<div '+
                'class="{prefix}arrow{type}">' +
                    '<a href="javascript:void(\'scroll {type}\')" ' +                      
                    '>scroll {type}</a>'+
                '</div>';
	
	
	
	
    /**
     * 请修改组件描述
     * @class Kscroll
     * @constructor
     * @extends Base
     */
    function Kscroll(container, config) {
        var self = this;
        Kscroll.superclass.constructor.call(self, config);
        self._init(container);
    }
	
    S.extend(Kscroll, Base, /** @lends Kscroll.prototype*/{

        //初始化Scroll
        _init:function (container) {
            var self = this,
                prefix = "." + self.get("prefix");
            //判断容器是否正确
            container = self._wrap($(container));
            //初始化UI属性
            self.set("container", container);
            self.set("body", container.one(prefix + "body"));
            self.set("track", container.one(prefix + "track"));
            self.set("drag", this.get("track").one(prefix + "drag"));
            if (self.get("allowArrow")) {
                self.set("arrowUp", container.one(prefix + "arrowup"));
                self.arrowUpHeight = self.get("arrowUp").outerHeight();
                self.set("arrowDown", container.one(prefix + "arrowdown"));
                self.arrowDownHeight = self.get("arrowDown").outerHeight();
            } else {
                self.arrowUpHeight = self.arrowDownHeight = 0;
            }
            //绑定各种事件
            self._bindEvt();
            //初始化尺寸
            self._setSize();
        },

        destroy:function () {
            var self = this,
                container = self.get("container"),
                track = self.get("track"),
                arrowUp = self.get("arrowUp"),
                arrowDown = self.get("arrowDown"),
                c = container.children().item(0);
            if (arrowUp) {
                arrowUp.remove();
            }
            if (arrowDown) {
                arrowDown.remove();
            }
            c.insertBefore(container);
            container.remove();
            c.css(self.__backup);
            c.removeClass(self.get("prefix") + "body");
        },

        _wrap:function (container) {
            var self = this,
                prefix = self.get("prefix"),
                wrap = $("<div></div>");

            //ie6下自动扩展问题
            if(S.UA.ie==6){
                container.css({"overflow":"auto"});
            }

            //panel wrap
            wrap.insertAfter(container).append(container);

            //增加基本样式
            wrap.addClass(prefix + "container")
                .css({
                    position:"relative",
                    overflow:"hidden",
                    width:container.outerWidth(),
                    height:container.outerHeight()
                });

            //滚动条
            wrap.append(S.substitute(SCROLL_HTML, {
                prefix:prefix
            }));
            
            var scrollbar=wrap.one("."+prefix + "scrollbar");

            self.set("scrollBar",scrollbar);   

            //向上，向下箭头
            if (self.get("allowArrow")) {
                scrollbar.append(S.substitute(ARROW, {
                    type:'up',
                    prefix:prefix
                }));
                scrollbar.append(S.substitute(ARROW, {
                    type:'down',
                    prefix:prefix
                }));
            }

            var style = container[0].style;

            self.__backup = {
                "position":style.position,
                "top":style.top,
                "left":style.left,
                "width":style.width,
                "height":style.height,
                "overflow":style.overflow
            };

            //增加panel hook
            container.css({
                "position":"absolute",
                "top":0,
                "left":0,
                "width":"100%",
                "height":"auto",
                "overflow":"visible"
            })
                .addClass(prefix + "body");


            return wrap;
        },

        _bindArrow:function (type) {
            var self = this,
                type2 = capitalFirst(type),
                speed = 0,
                timer = null,
                prefix = self.get("prefix"),
                n = self.get("arrow" + type2),
                timeSet = function () {
                    speed += 1;
                    var step = self.get("step");
                    var sh = type == "up" ? step : -step,
                        t = 300 - speed * 25;
                    self.scrollByDistance(sh);
                    if (t <= 30) {
                        t = 30
                    }
                    timer = setTimeout(function () {
                        timeSet();
                    }, t);
                };

            n.on("click",
                function () {
                    var sh = self.get("step");
                    self.scrollByDistance(type == "up" ? sh : -sh);
                }).on("mousedown",
                function () {
                    n.addClass(prefix + "arrow" + type + "-active");
                    timeSet();
                }).on("mouseup",
                function () {
                    n.removeClass(prefix + "arrow" + type + "-active");
                    speed = 0;
                    clearTimeout(timer);
                }).on("mouseleave",
                function () {
                    // 靠mouseup清除定时器不靠谱，因为有些情况下可以不执行mouseup
                    n.removeClass(prefix + "arrow" + type + "-active");
                    speed = 0;
                    n.removeClass(prefix + "arrow" + type + "-hover");
                    clearTimeout(timer);
                }).on("mouseover",
                function () {
                    n.addClass(prefix + "arrow" + type + "-hover");
                });
        },

        _bindDrag:function () {
            var doc = $(document),
                self = this,
                pageY,
                prefix = self.get("prefix"),
                current = 0,
                drag = self.get("drag"),
                track = self.get("track"),
                moveFn = function (ev) {
                    var trackLen = track.outerHeight(),
                        dragLen = drag.outerHeight(),
                        t = trackLen - dragLen,
                        position = current + (ev.pageY - pageY);

                    //最上面
                    if (position < 0) {
                        position = 0;
                    }

                    //最下面
                    if (position > t) {
                        position = t;
                    }


                    drag.css("top", position);

                    self.scrollByPercent(position / t,1);
                };

            //绑定各种drag事件
            drag
                .on("mouseenter", function (ev) {
                drag.addClass(prefix + "drag-hover");
            })
                .on("mouseleave", function (ev) {
                    drag.removeClass(prefix + "drag-hover");
                })
                .on("click", function (ev) {
                    // prevent track handle it
                    ev.stopPropagation();
                })
                .on("mousedown", function (ev) {
                    drag.addClass(prefix + "drag-active");
                    current = parseInt(drag.css("top")) || 0;
                    pageY = ev.pageY;
                    doc
                        .on("mousemove", moveFn)
                        .on("mouseup", function () {
                            drag.removeClass(prefix + "drag-active");
                            doc.detach("mousemove", moveFn);
                            doc.detach("mouseup", arguments.callee);
                            pageY = 0;
                        });

                });
        },
		
		//完美支持键盘滚动
		_bindHotkey: function(){
            var self = this,
				body = self.get("body"),
                container = self.get("container"),
                canMousewheel = function(direction){
                    var position = toInt(body.css("top"));
                    if(direction>0 && position>=0){
                        return false;
                    }
                    if(direction<0 && position+body.outerHeight()<=container.outerHeight()){
                        return false;
                    }
                    return true;
                };
                
			//当前容器一定要获取焦点才能使用键盘事件
			//考虑到outline实在影响美观，直接删掉
			container.css("outline","none").attr("tabindex",S.guid()).on("keydown", function (ev) {
				var keycode = ev.keyCode,
					sh = self.get("step");
				
				//修复内容区域含有textarea bug
				if(~"INPUT,TEXTAREA".indexOf(ev.target.nodeName.toUpperCase())){
					return;
				}
					
				if(!~"38,39,36,40,37,35".indexOf(keycode)){
					return;
				}

				var d = ~"38,39,36".indexOf(keycode)?sh:-sh;
				if(canMousewheel(d)){
					ev.halt();
				}
				
				switch(keycode){
					case 38:
					case 39:
						self.scrollByDistance(sh);
						break;
					case 40:
					case 37:
						self.scrollByDistance(-sh);
						break;
					case 36:
						self.scrollByPercent(0);
						break;
					case 35:
						self.scrollByPercent(1);
						break;
				}
            });
			
		},

        _bindTrack:function () {
            var self = this,
                prefix = self.get("prefix");
            var track = self.get("track");
            track.
                unselectable()
                .on("click",
                function (ev) {
                    self.scrollByPercent((ev.pageY - track.offset().top ) / (track.outerHeight()));
                })
                .on("mousedown", function (ev) {
                    // prevent chrome selection
                    ev.preventDefault();
                })
                .on("mouseenter",
                function () {
                    track.addClass(prefix + "track-hover");
                })
                .on("mouseleave", function (ev) {
                    track.removeClass(prefix + "track-hover");
                });
        },
		
		//拖动内容区域滚动
		_bindBodyDrag: function(){
			var self = this,
				doc = $(document),
				body = self.get("body"),
				pageY = 0,
				moveFn = function(ev){
					if(pageY>ev.pageY){
						self.scrollByDistance(5);
					}else{
						self.scrollByDistance(-5);
					}
				};
			
			body.on("mousedown", function(ev){
				pageY = ev.pageY;
				doc
					.on("mousemove", moveFn)
					.on("mouseup", function () {
						doc.detach("mousemove", moveFn);
						doc.detach("mouseup", arguments.callee);
						pageY = 0;
					});
			});
			
		},

        _bindContainer:function () {
            var self = this,
                //在最上或者最下再滚动，不要阻止浏览器默认事件
                body = self.get("body"),
                container = self.get("container"),
                canMousewheel = function(direction){
                    var position = toInt(body.css("top"));
                    if(direction>0 && position>=0){
                        return false;
                    }
                    if(direction<0 && position+body.outerHeight()<=container.outerHeight()){
                        return false;
                    }
                    return true;
                };
            //滚轮事件
            self.get("container").on("mousewheel", function (ev) {
                if(canMousewheel(ev.deltaY)){
                    ev.halt();
                }
                var sh = self.get("step");
                self.scrollByDistance(ev.deltaY > 0 ? sh : -sh);
            });
        },

        //绑定事件
        _bindEvt:function () {
            var self = this;

            self._bindContainer();

            //上下箭头
            if (self.get("allowArrow")) {
                self._bindArrow("up");
                self._bindArrow("down");
            }

            //单击轨道
            self._bindTrack();

            //拖动滚动条
            self._bindDrag();
			
			//键盘支持
			if(self.get("hotkey")===true){
				self._bindHotkey();
			}
			
			//支持在内容区域拖动
			if(self.get("bodydrag")){
				self._bindBodyDrag();
			}
			
        },

        //重置大小
        resize:function (w, h) {
            var self = this;
            self.get("container").css({
                width:w,
                height:h
            });
            self._setSize();
        },

        //设置大小
        _setSize:function () {
            //设置滚动幅度
            var self = this,
                bh = self.get("body").outerHeight(),
                sh,
                ch = self.get("container").innerHeight(),
                arrowUp = self.get("arrowUp"),
                arrowDown = self.get("arrowDown"),
                track = self.get("track"),
                drag = self.get("drag"),
                ah = self.arrowUpHeight + self.arrowDownHeight;

            if (bh <= ch || ch < ah) {
				//水儿发现的bug,某些情况下滚动条隐藏，top>0
				self.get("body").css({"top":0});				
                self.get("scrollBar").hide();
                return;
            } else {
                self.get("scrollBar").show();
            }

            sh = (ch - ah) * ch / bh;

            if (sh < 20) {
                sh = 20;
            }

            if (!self.get("step")) {
                self.set("step", Math.max(sh / 6, 10));
            }

            track.css({
                height:ch - ah,
                top:self.arrowUpHeight
            });

            //drag
            drag.css({
                height:sh
            });

        },

        //滚动到指定位置
        _scrollBodyToPosition:function (position) {
            var self = this,
                container = self.get("container"),
                body = self.get("body"),
                t = body.outerHeight() - container.innerHeight();
            if (t < 0) {
                return;
            }
            if (position > 0) {
                position = 0;
            }
            if (toPositive(position) > t) {
                position = -t;
            }
            body.css("top", position);
        },

        scrollByDistance:function (distance, notUpdateBar) {
            var self = this,
                position = parseInt(self.get("body").css("top")) + distance;
            self._scrollBodyToPosition(position);
            if (!notUpdateBar) {
                self._updateBar();
            }
        },

        scrollByPercent:function (percent, notUpdateBar) {
            var self = this;
            percent = parseFloat(percent, 10);
            if (isNaN(percent) || percent > 1 || percent < 0) {
                return;
            }
            var d = (self.get("body").outerHeight() - self.get("container").innerHeight()) * (-percent);
            self._scrollBodyToPosition(d);
            if (!notUpdateBar) {
                self._updateBar();
            }
        },

        //滚动到指定元素
        scrollToElement:function (el) {
            el = $(el);
            if (!el.length) {
                return;
            }
            var self = this,
                position = el.offset().top - self.get("body").offset().top;
            self._scrollBodyToPosition(-position);
            self._updateBar();
        },

        //同步滚动条位置
        _updateBar:function () {
            var self = this,
                drag = self.get("drag"),
                th = self.get("track").innerHeight() - drag.outerHeight(),
                body = self.get("body"),
                container = self.get("container"),
                percent = toPositive(parseInt(body.css("top"))) / (body.outerHeight() - container.innerHeight());
            drag.css("top", percent * th);
        }

	
    }, {ATTRS : /** @lends Kscroll*/{
        prefix:{
            value:"ks-"
        },
        duration:{
            value:0.1
        },
        easing:{
            value:"easeNone"
        },
        container:{},
        body:{},
        track:{},
        drag:{},
        arrowUp:{},
        allowArrow:{value:true},
        arrowDown:{},
        step:{},
        scrollBar:{}
    }});
	
    return Kscroll;
	
}, {requires:['node', 'base']});





/**
 * @fileoverview 
 * @author 九十<wongguang.wg@alibaba-inc.com>
 * @module nbSelect
 **/
KISSY.add('1.0/index',function(S, XTemplate, DOM, Kscroll){
    
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


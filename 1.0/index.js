/**
 * @fileoverview 
 * @author 九十<wongguang.wg@alibaba-inc.com>
 * @module nbselect
 **/
KISSY.add(function (S, Node,Base) {
    var EMPTY = '';
    var $ = Node.all;
    /**
     * 
     * @class Nbselect
     * @constructor
     * @extends Base
     */
    function Nbselect(comConfig) {
        var self = this;
        //调用父类构造函数
        Nbselect.superclass.constructor.call(self, comConfig);
    }
    S.extend(Nbselect, Base, /** @lends Nbselect.prototype*/{

    }, {ATTRS : /** @lends Nbselect*/{

    }});
    return Nbselect;
}, {requires:['node', 'base']});




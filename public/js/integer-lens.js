var IntegerLens = function(options) {
    this.name = 'IntegerLens';
    
    this.outputRows = [];
    
    this.startOffset = -1;
    this.endOffset = -1;
    this.length = 0;
    this.currContentWidth = -1;
    
    this.bpl = 0;
    this.firstDrawByteOffset = 0;
    this.lastFirstDrawByteOffset = 0;
    
    this.commentPopovers = [];
    
    this.wSz = 4;
    this.littleEndian = true;
    this.signed = true;
};

IntegerLens.prototype.getName = function() {
    return this.name;
};

IntegerLens.prototype.getSettingList = function() {
    return [{name: 'signed', label: 'Signed', type: 'bool', value: this.signed}, {name: 'littleendian', label: 'Little Endian', type: 'bool', value: this.littleEndian}, {name: 'wordsize', label: 'Word Size', type: 'list', options: [{k:'2',v:'2'},{k:'4',v:'4'}], value: this.wSz.toString()}];
};

IntegerLens.prototype.changeSettings = function(newSettings, reprocess) {
    this.wSz = parseInt(newSettings['wordsize']);
    this.littleEndian = newSettings['littleendian'];
    this.signed = newSettings['signed'];
    
    if (reprocess) {
        this.preprocessData(this.startOffset, this.endOffset, this.currContentWidth);
    }
};

IntegerLens.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
    
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.length = Math.floor((endOffset-startOffset)/4);
    this.currContentWidth = contentWidth;
    
    fetchDataUint8(startOffset, endOffset);
    
    this.outputRows = [];
    
    var outputIntLine = [];
    var startOffsetHex = '';
        
            var bpl = Math.floor((contentWidth-100)/100);
            this.bpl = Math.floor(bpl/2)*2;
            bpl = this.bpl;
    
    var wSz = this.wSz;
    
    var convDataFunc = dataView.getInt32.bind(dataView);
    
    if (this.wSz === 4 && !this.signed) {
        convDataFunc = dataView.getUint32.bind(dataView);
    } else if (this.wSz === 2) {
        if (this.signed) {
            convDataFunc = dataView.getInt16.bind(dataView);
        } else {
            convDataFunc = dataView.getUint16.bind(dataView);
        }
    }
    
            /*if (startOffset%(wSz*bpl) !== 0)
            {
                console.log('special case: startOffset not aligned');
                startOffsetHex = '<span class="offset">0x' + ("00000000"+(startOffset-startOffset%(wSz*bpl)).toString(16)).slice(-8).toUpperCase() + '</span>'
            outputIntLine.push('<div class="integerrow" data-offset="' + (startOffset-startOffset%(wSz*bpl)) + '">' + startOffsetHex);
                for (var i = Math.floor(startOffset - startOffset%(wSz*bpl)); i < startOffset; i=i+wSz)
                {
                    outputIntLine.push('<span class="int blank">' + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + '</span>');
                }
            }*/

            for (var i = startOffset; i < endOffset - endOffset%wSz; i=i+wSz)
            {
                //if (i%(bpl*wSz) >= 0 && i%(bpl*wSz) < wSz) {
                if (outputIntLine.length === 0) {
                    console.log('beginning new row');
                    startOffsetHex = '<span class="offset">0x' + ("00000000"+i.toString(16)).slice(-8).toUpperCase() + '</span>'
                    outputIntLine.push('<div class="integerrow" data-offset="' + i + '">' + startOffsetHex);
                }
                
                outputIntLine.push('<span class="int" data-offset="' + i.toString(10) + '">' + convDataFunc(i, this.littleEndian) + '</span>');
                
                //if (/*i%(wSz*bpl) <= 0 &&*/ i%(wSz*bpl) >= (wSz*bpl)-wSz) {
                if (outputIntLine.length === this.bpl+1) {
                    console.log('ending row');
                    outputIntLine.push('</div>');
                    this.outputRows.push(outputIntLine.join(''));
                    outputIntLine = [];
                }
            }
    
            //if ((endOffset - endOffset%wSz) % (wSz*bpl) !== 0) {
            if (outputIntLine.length < this.bpl+1 && outputIntLine.length !== 0) {
                //for (var i = endOffset%(wSz*bpl); i < (wSz*bpl)+wSz; i=i+wSz)
                while(outputIntLine.length < this.bpl+1)
                {
                    outputIntLine.push('<span class="int blank">' + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + '</span>');
                }
                outputIntLine.push('</div>');
                this.outputRows.push(outputIntLine.join(''));
                outputIntLine = [];
            } 
};

IntegerLens.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    if (scrollPosY < 0) scrollPosY = 0;
    var sI = Math.floor(scrollPosY/20);
    var eI = sI + Math.floor(viewHeight/20) + 1;
    console.log("generate Int View: " + sI + " " + eI);
    var outputRowSlice = this.outputRows.slice(sI, eI);
    
    this.lastFirstDrawByteOffset = this.firstDrawByteOffset;
    this.firstDrawByteOffset = sI * this.bpl;
    
    var intViewContent = '<div class="content integerview">' + outputRowSlice.join('') + '</div>';
    return {content: intViewContent, contentHeight: outputRowSlice.length*20, commentPopovers: true};
};

IntegerLens.prototype.windowResized = function(newWidth) {
    if (newWidth !== this.currContentWidth) {
        this.preprocessData(this.startOffset, this.endOffset, newWidth);
    }
};

IntegerLens.prototype.getContentHeight = function() {
    return this.outputRows.length * 20;
};

IntegerLens.prototype.getHeaderSummary = function() {
    return ('0x' + ("00000000" + this.startOffset.toString(16)).slice(-8).toUpperCase() + ' - 0x' + ("00000000" + (this.endOffset - 1).toString(16)).slice(-8).toUpperCase() + ' (Len: ' + this.length + ')');
};

IntegerLens.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
    if (this.commentPopovers[commentOffset + "text"].isOpened() || this.commentPopovers[commentOffset + "hex"].isOpened()) {
        $('.thread-comment')[1].remove();
    }
};

IntegerLens.prototype.addCommentPopoverContent = function(threadOffset, comment, author) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].addCommentPopoverUpdate(threadOffset, comment, author);
    }
};

IntegerLens.prototype.updateComments = function() {
    var regionThreads = getThreads(this.startOffset, this.endOffset);
    
    for (var i = 0; i < this.commentPopovers.length; i++) {
        if (typeof this.commentPopovers[i] !== "undefined") {
            this.commentPopovers[i].destroy();
        }
    }
    this.commentPopovers = [];
    
    var queryElements = $('.cfasection[data-start-offset="' + this.startOffset + '"').next().find('.int');
    
    for (var j = 0; j < queryElements.length; j++) {
        var queryElement = queryElements.filter(':eq(' + j + ')');
        var intStartOffset = parseInt(queryElement.data('offset'));
        var intLen = this.wSz;
        queryElement.removeClass('hasComment');
        for (var i = 0; i < regionThreads.length; i++) {
            if (!queryElement.hasClass('hasComment')) {
                if (regionThreads[i] >= intStartOffset && regionThreads[i] < intStartOffset+intLen) {
                    queryElement.addClass('hasComment');
                    queryElement.before('<comment-caret title="' + getThread(regionThreads[i]).getSummary() + '"data-offset="' + regionThreads[i] + '"><span></span></comment-caret>');
                    
                    queryElement.prev().offset(queryElement.offset());
                    
            
                    var commentPopover = new CommentPopover();
                    commentPopover.initPopover(queryElement.prev('comment-caret')[0], regionThreads[i], intLen, this);
                    this.commentPopovers[regionThreads[i]] = commentPopover;
                }
            }
        }
    }
};

$('body').on({
        mouseenter : function() {
            if (toolMode === 'split') {
                //$(this).addClass("toolAffect");
                $('div.integerview').find('.int[data-offset="' + $(this).attr('data-offset') + '"]').addClass("toolAffect");
            } else if (toolMode === 'comment') {
                $('div.integerview').find('.int[data-offset="' + $(this).attr('data-offset') + '"]').addClass("toolAffect");
            }
        },
        mouseleave : function() {
            //$(this).removeClass("toolAffect");
            $('div.integerview').find('.int[data-offset="' + $(this).attr('data-offset') + '"]').removeClass("toolAffect");
        },
        click      : function() {
            if (toolMode === 'split') {
                socket.emit('split', {splitOffset: parseInt($(this).attr('data-offset'))});
            } else if (toolMode === 'comment') {
                if (!threadExists(parseInt($(this).attr('data-offset')))) {
                    $('.create-comment-modal').data('offset', parseInt($(this).attr('data-offset')));
                    $('.create-comment-modal').modal('show');
                }
            }
            return false;
        }
    }, '.integerview span:not(.blank)');
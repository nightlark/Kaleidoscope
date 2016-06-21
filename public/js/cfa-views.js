

function generateAsmViewContent(startOffset, endOffset, sectionName) {
            var outputAddress = [];
            var outputInstruction = [];
            var outputComments = [];

            // Initialize the decoder
            var cs = new capstone.Cs(capstone.ARCH_X86, capstone.MODE_64);

            var typedArray = new Uint8Array(arrayBuffer, startOffset, endOffset - startOffset);
            // Output: Array of capstone.Instruction objects
            var instructions = cs.disasm(typedArray, startOffset);
            console.log(instructions);
            var i = 0;

            // Display results;
            instructions.forEach(function(instr) {
                console.log("0x%s:\t%s\t%s",
                    instr.address.toString(16),
                    instr.mnemonic,
                    instr.op_str
                );
                outputAddress.push('<span>0x' + instr.address.toString(16) + '</span><br>');
                outputInstruction.push('<span>' + instr.mnemonic + ' ' + instr.op_str + '</span><br>');
                outputComments.push('<input type="text" placeholder="Empty Comment" data-comment-id="' + i + '"><br>');
                i++;
            });

            // Delete decoder
            cs.delete();

            var asmViewContent = '<div class="content asmview"><div class="address">' + outputAddress.join('') + '</div><div class="instruction">' + outputInstruction.join('') + '</div><div class="comments">' + outputComments.join('') + '</div></div>'

            return asmViewContent;
        }

        function drawSection(section, drawOffset, drawHeight) {
            var lens = section.lenses[section.currentLens];
            
            var $sectionDiv = $("<div>", {
                class: "cfasection"
            });
            
            var s = '';
            console.log('lens list');
            for(var val in availableLenses) {
                s += '<option value="' + availableLenses[val].value + '">' + availableLenses[val].text + '</option>';
            }
            
            $sectionDiv.html('<span class="sectionSummary">' + lens.getHeaderSummary() + '</span>' +
                             '<span style="float: right;"><select id="selectedLens">' + s + '</select>' +
                             '<a href="#" onclick="return false;"><span class="glyphicon glyphicon-cog lens-settings' + (lens.getSettingList().length === 0 ? ' disabled' : '') + '" aria-hidden="true"></span></a></span>');
            
            $sectionDiv.attr("data-start-offset", section.startOffset.toString());
            $sectionDiv.attr("data-end-offset", section.endOffset.toString());
            $sectionDiv.attr("data-section-name", section.sectionName);
            
            var currLensView = lens.generateView(drawOffset, $('.main').width(), drawHeight);

            $('.main').append($sectionDiv);
            
            var selectedLensList = $('.cfasection[data-start-offset="' + section.startOffset + '"] #selectedLens');
            
            selectedLensList.change(function() {
                console.log('changed selection');
                socket.emit('lensChange', {startSection: section.startOffset, newLens: this.value});
            });
            
            selectedLensList.val(section.currentLens);
            
            //selectedLensList.editable({
            //    value: section.currentLens,
            //    source: availableLenses
            //});
            
            //selectedLensList.on('save', function(e, params) {
            //    console.log(e);
            //    console.log(params);
            //    socket.emit('lensChange', {startSection: section.startOffset, newLens: params.newValue});
            //});
            
            var lensSettingButton = $('.cfasection[data-start-offset="' + section.startOffset + '"] .lens-settings');
            
            if (section.lenses[section.currentLens].getSettingList().length !== 0) {
                    lensSettingButton.popover({
                    html: true,
                    placement: 'bottom',
                    container: 'body',
                    title: function() {
                        return 'Lens Settings';
                    },
                    content: function() {
                        var settings = section.lenses[section.currentLens].getSettingList();
                        console.log(settings);
                        console.log(this);
                
                        var name = 'lensSettingForm';
                
                        var contents = '<form id="lensSettingForm" data-section="' + section.startOffset.toString() + '" onsubmit="saveLensSettings(' + name + ')">';

                        for (var setting in settings) {
                            contents += '<p>';
                            if (settings[setting].type === 'bool') {
                                contents += '<label><input type="checkbox" name="' + settings[setting].name + '"' + (settings[setting].value ? ' checked' : '') + '>' + settings[setting].label + '</label>';
                            } else if (settings[setting].type === 'list') {
                                contents += '<label>' + settings[setting].label + '</label>';
                                contents += '<select name="' + settings[setting].name + '">';
                                for (var opt in settings[setting].options) {
                                    var options = settings[setting].options;
                                    contents += '<option';
                                    contents += ' value="' + options[opt].k + '"';
                                    if (options[opt].k === settings[setting].value) {
                                        contents += ' selected';
                                    }
                                    contents += '>' + options[opt].v + '</option>';
                                }
                                contents += '</select>';
                            }
                            contents += '</p>';
                        }
                        contents += '<p>';
                        contents += '<button type="submit" class="btn btn-sm btn-primary"><span class="glyphicon glyphicon-ok"></span></button>';
                        contents += '<button type="button" class="btn btn-sm btn-default" onclick="hideLensSettings(' + name + ')"><span class="glyphicon glyphicon-remove"></span></button>';
                        contents += '</p>';
                        contents += '</form>';
                        return contents;
                    }
                });
            }

            $('.main').append(currLensView.content);
            
            lens.updateComments();
            
            return currLensView;
        }

        function addAsmView(startOffset, endOffset, sectionId, sectionName, afterSectionId) {
            addSection(startOffset, endOffset, sectionId, sectionName, afterSectionId, generateAsmViewContent(startOffset, endOffset, sectionName), 'asmview');
        }


var startSection = 0;

        function drawViewArea(pos) {
            var startSectionIndex = 0;
            var startSectionOffset = 0;
            var startSectionEnd = 0;
            for (startSectionIndex = 0; startSectionIndex < sections.length; startSectionIndex++) {
                var currLens = sections[startSectionIndex].currentLens;
                startSectionOffset = pos - (startSectionEnd + 10);
                startSectionEnd += sections[startSectionIndex].lenses[currLens].getContentHeight() + 30;
                if (startSectionEnd >= pos) {
                    break;
                }
            }
            
            startSection = startSectionIndex;
            
            console.log("-------begin drawViewArea--------");
            /*console.log("startSectionIndex: " + startSectionIndex);
            console.log("startSectionOffset: " + startSectionOffset);
            console.log("startSectionEnd: " + startSectionEnd);*/

            $('.main').empty();
            var endOfView;
            var dispHeightLeft = $(window).height() - 50;
            for (var i = startSectionIndex; i < sections.length; i++) {
                var currLens = sections[startSectionIndex].currentLens;
                var lensInfo = drawSection(sections[i], startSectionOffset, dispHeightLeft);
                dispHeightLeft -= lensInfo.contentHeight;
                console.log("--drawSection--");
                /*console.log("drawSectionIndex: " + i);
                console.log("drawSectionOffset: " + startSectionOffset);
                console.log("dispHeightLeft: " + dispHeightLeft);
                console.log("lensContentHeight: " + lensInfo.contentHeight);*/
                if (dispHeightLeft <= 0) {
                    return;
                }
                startSectionOffset = 0;
                startSectionEnd += sections[startSectionIndex].lenses[currLens].getContentHeight() + 30;
            }
        }
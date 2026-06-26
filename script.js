let undoStack = [];
let redoStack = [];
let cssFile;
let styleTag;
let htmlContent;
let srcSet = new Set();

const rule = {
    'Roll20_coc.css': /sheet-rolltemplate-coc-/,
    'Roll20_Ins.css': /sheet-rolltemplate-Ins/,
    'Roll20_Ninpo.css': /sheet-rolltemplate-Ninpo/,
    'Roll20_agon.css': /sheet-rolltemplate-agon-/,
    'Roll20_callofcthulhu.css': /sheet-rolltemplate-callofcthulhu|sheet-rolltemplate-coccm|sheet-rolltemplate-skillimprovement/,
    'Roll20_daegong.css': /sheet-rolltemplate-daegong-/,
    'Roll20_dw.css': /sheet-rolltemplate-move|sheet-rolltemplate-dwgeneral|sheet-rolltemplate-spell/,
    'Roll20_Dx3Dice.css': /sheet-rolltemplate-Dx3Dice/,
    'Roll20_Magic.css': /sheet-rolltemplate-Magic|sheet-rolltemplate-modulation-table|sheet-rolltemplate-fate-mutation-table|sheet-rolltemplate-ordinary-scene-table|sheet-rolltemplate-fumble-table|sheet-rolltemplate-event-table/,
    'Roll20_Nc.css': /sheet-rolltemplate-Nc/,
    'Roll20_Strato.css': /sheet-rolltemplate-Strato/
};

const sheet = {
    'Roll20_coc.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/coc7e/v1.0.0/coc_7th_ed.png',
    'Roll20_Ins.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/insane/v1.0.0/inSANe.png',
    'Roll20_Ninpo.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/shinobigami/v1.0.0/ShinobiGami.png',
    'Roll20_agon.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/agonofficial/v1.0.0/agon.png',
    'Roll20_callofcthulhu.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/callofcthulu/v1.0.0/preview.png',
    'Roll20_daegong.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/grdukeofficial/v1.0.0/northgrandduke.png',
    'Roll20_dw.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/dungeonworldofficial/v1.0.0/Dungeon%20World%20preview.png',
    'Roll20_Dx3Dice.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/doublecross3e/v1.0.0/DoubleCross3rd.png',
    'Roll20_Magic.css': 'https://storage.googleapis.com/char-sheet-app-dff083b4/charsheets/magicalogica/sheet.png?1641489560',
    'Roll20_Nc.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/nechronica/v1.0.0/nechronica.png',
    'Roll20_Strato.css': 'https://storage.googleapis.com/roll20-cdn/sheetsockets/stratoshout/v1.0.0/stratoshout.png'
}

// tipsy
function autoGrav() {
    if ($(this).hasClass('tipsy-w')) return 'w';
    if ($(this).hasClass('tipsy-e')) return 'e';
    if ($(this).hasClass('tipsy-n')) return 'n';
    if ($(this).hasClass('tipsy-s')) return 's';
    if ($(this).hasClass('tipsy-n-right')) {
        const rightOffset = $(window).width() - $(this).offset().left;
        return rightOffset < $(this).parents('.message').width() / 2 ? 'ne' : 'n';
    }
    if ($(this).hasClass('tipsy-side')) return $(this).offset().left > ($(document).scrollLeft() + $(window).width() / 2) ? 'e' : 'w';
    return $(this).offset().top > ($(document).scrollTop() + $(window).height() / 2) ? 's' : 'n';
}

// 상태 저장
function saveState() {
    undoStack.push($('#log-view').html());
    if (undoStack.length > 20) undoStack.shift();
    redoStack = [];
    $('#undo-btn').show();
    $('#redo-btn').hide();
}

// 상태 복원
function restoreState(html) {
    $('#log-view').html(html);
}

// Undo / Redo
function undo() {
    if (undoStack.length === 0) return;
    if (undoStack.length <= 1) { $('#undo-btn').hide(); }
    redoStack.push($('#log-view').html());
    const prev = undoStack.pop();
    restoreState(prev);
    $('#redo-btn').show();
}

function redo() {
    if (redoStack.length === 0) return;
    if (redoStack.length <= 1) { $('#redo-btn').hide(); }
    undoStack.push($('#log-view').html());
    const next = redoStack.pop();
    restoreState(next);
    $('#undo-btn').show();
}

$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
});

// Undo/Redo 버튼
$('#undo-btn').on('click', undo);
$('#redo-btn').on('click', redo);

// 도움말
$('#help-what').on('click', function(e) {
    e.stopPropagation();
    $('#pop-what').addClass('active');
});

$('#help-img').on('click', function(e) {
    e.stopPropagation();
    $('#pop-img').addClass('active');
});

$(document).click(function() {
    $('.pop-up').removeClass('active');
});

// 샘플 데이터 삭제
$('#html-text').one('click', function() {
    $(this).val('');
    $('#sample span').hide();
    $('#start-edit').text('편집 시작');
})

// 드래그 & 드랍 이벤트 공통
$('.upload-box')
.on('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('active');
})
.on('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('active');
})
.on('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('active');
})
.on('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('active');
});

// 저장된 HTML 파일 올리기
$('#html-upload').on('drop', function(e) {
    if (e.originalEvent.dataTransfer.files.length > 1) {
        alert('파일은 1개만 업로드할 수 있습니다.');
        return;
    }
    const file = e.originalEvent.dataTransfer.files[0];
    uploadHtml(file);
});

$('#html-input').on('change', function(e) {
    const file = e.target.files[0];
    uploadHtml(file);
});

function uploadHtml(file) {
    if (!file) return;

    const name = file.name.toLowerCase()
    if (!name.endsWith('.html') && !name.endsWith('.txt')) {
        alert('HTML/TXT 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        if (!e.target.result.includes('div class="message')) {
            alert('롤20 형식의 HTML이 아닙니다.');
            return;
        }
        $('#html-text').trigger('click').val(e.target.result).trigger('input');
        $('#html-list').text('현재 파일: ' + file.name);
        $('#html-upload .upload-icon').hide();
    }
    reader.readAsText(file, 'utf-8');
}

// 시트 템플릿 자동 선택
$('#html-text').on('input', function() {
    if (!$('#custom').is('style')) {
        cssFile = null;
        const str = $(this).val();

        for (const [file, regex] of Object.entries(rule)) {
            if (regex.test(str)) {
                cssFile = file;
                break;
            } else {
                $('#css-img .img-null').text('인식된 캐릭터 시트가 없습니다. 롤20 기본 템플릿이 아닌 경우, 수동으로 시트를 선택하거나 커스텀 시트 CSS를 업로드해 주세요.');
                $('#css-img img').hide();
            }
        }

        $('#css-select').val(cssFile);
        if (sheet[cssFile]) {
            $('#css-img img').attr('src', sheet[cssFile]).show();
        }
    }
    $('#html-list').text('왼쪽에 코드를 붙여넣거나 여기에 HTML/TXT 파일을 업로드해 주세요.');
    $('#img-org, #img-chg').hide();
    $('#null-org, #null-chg, #html-upload .upload-icon').show();
    $('#link-org, #link-chg').val('');
});

// 시트 템플릿 수동 선택
$('#css-select').on('change', function() {
    cssFile = $(this).val();
    if (!cssFile) return;
    if ($('#custom').is('style')) {
        if (confirm('업로드한 커스텀 시트 CSS가 사라집니다. 계속하시겠습니까?')) {
            $('#css-list').text('여기에 커스텀 시트 CSS 파일을 업로드해 주세요.');
            $('#css-upload .upload-icon').show();
            $('.css-download').hide();
            styleTag = null;
            $('head style#custom').remove();
        } else return;
    }
    if (sheet[cssFile]) {
        $('#css-img img').attr('src', sheet[cssFile]).show();
    } else {
        $('#css-img img').hide();
    }
})

// 커스텀 시트 CSS 올리기
$('#css-upload').on('drop', function(e) {
    if (e.originalEvent.dataTransfer.files.length > 1) {
        alert('파일은 1개만 업로드할 수 있습니다.');
        return;
    }
    const file = e.originalEvent.dataTransfer.files[0];
    uploadCss(file);
});

$('#css-input').on('change', function(e) {
    const file = e.target.files[0];
    uploadCss(file);
});

function uploadCss(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css')) {
        alert('CSS 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const cssText = e.target.result;

        if (!/\.sheet-rolltemplate-/.test(cssText)) {
            alert('롤20 형식의 CSS가 아닙니다.');
            extractedCss = '';
            return;
        }

        const matches = cssText.match(
            /(?:\.sheet-rolltemplate-[^{]+{[^}]*}|@[^{]+{[^}]*})/gs
        );

        if (!matches || matches.length === 0) {
            alert('롤20 형식의 CSS가 아닙니다.');
            extractedCss = '';
            return;
        }

        extractedCss = matches.join('\n\n');
        styleTag = `<style id="rolleditor custom">${extractedCss}</style>`;
        $('head style#custom').remove();
        $('head').append(styleTag);
    };
    
    reader.readAsText(file, 'utf-8');
    cssFile = null;
    $('#css-select option:eq(0)').prop('selected', true);
    $('#css-img img, #css-img .img-null, #css-upload .upload-icon').hide();
    $('#css-img #css-custom').show();
    $('.css-download').css('display', 'flex');
    $('#css-list').text('현재 파일: ' + file.name);
    $('#css-view').text(file.name);
}

// 파일 바꾸기
$('#show-file').on('click', function() {
    if (confirm('돌아올 때 편집 내역이 초기화됩니다. 계속하시겠습니까?')) {
        $('#section-edit').hide();
        $('#section-upload').show();
    } else return;
});

// 커스텀 시트 없는 경우 CSS 후속 작업
function internalcss(cssFile) {
    $('#css-sheet').attr('href', cssFile);
    $('#css-view').text(cssFile);

    fetch(`./${cssFile}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(cssContent => {
            styleTag = `<style id="rolleditor">\n${cssContent}\n</style>`;
        });
}

// 압축
function compress() {
    $('#log-view .message .flyout').remove();
    $('#log-view .message').removeAttr('data-messageid');
}

// 아바타 src 수집
function avatarimg() {
    srcSet.clear();

    $('#log-view .message .avatar img').each(function() {
    const src = $(this).attr('src');
    if (src) {
        srcSet.add(src);
    }
    });

    $('#avatar-list').empty();

    // img 추가
    srcSet.forEach(function(src) {
    $('<img>', {
        src: src
    }).appendTo('#avatar-list');
    });
}

// 🔹 sleep 유틸
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 편집 기능 추가
async function attachHdl() {
    const messages = $('#log-view .message');
    for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        batch.each(function() {
            const $msg = $(this);
            if ($msg.find('.hdl-body').length === 0) {
                const controls = $(`
                    <div class="hdl-body">
                        <div class="hdl-move"></div>
                        <div class="hdl-box">
                        <button class="hdl-edit" alt="수정"/>
                        <button class="hdl-copy" alt="복제"/>
                        <button class="hdl-delete" alt="삭제"/>
                        </div>
                    </div>
                `);
                $msg.append(controls);
            }
        });
        updateLoadingProgress(66 + Math.floor((i / messages.length) * 20), `편집 기능 로딩 중⋯ (${i}/${messages.length})`);
        await sleep(10); // 여유 시간
    }
}

// 🔹 정렬 기능 초기화 비동기
async function initSortable(selector) {
    // DOM 안정화 잠깐 대기
    await sleep(50);

    // 실제 sortable 초기화
    const container = $(selector);
    container.sortable({
        items: ".message",
        handle: ".hdl-move",
        cursor: "move",
        placeholder: "msg-placeholder",
        axis: "y",
    });
}

// 편집 시작
$('#start-edit').on('click', async function() {
    if (!$('#html-text').val()) {
        alert('편집할 로그를 입력한 뒤 시작해 주세요.');
        return;
    }

    if (!$('#html-text').val().includes('div class="message')) {
        alert('롤20 형식의 HTML이 아닙니다.');
        return;
    }

    saveState();
    showLoadingOverlay();
    updateLoadingProgress(0, 'HTML 불러오는 중⋯');
    await sleep(50); // UI 렌더링 여유

    $('#section-upload').hide();
    $('#log-view').empty();
    const htmlCode = $('#html-text').val();
    $('#log-view').html(htmlCode);

    updateLoadingProgress(33, '코드 압축 중⋯');
    await sleep(30);
    compress();
    avatarimg();

    updateLoadingProgress(66, '편집 기능 로딩 중⋯');
    await attachHdl();
    if (cssFile) { internalcss(cssFile); }

    if ($('#log-view .tstamp').length > 0) {
        $('#check-ts').hide();
        $('#remove-ts').show();
    }

    if ($('#log-view .hidden-message').length > 0) {
        $('#check-hidden').hide();
        $('#remove-hidden').show();
    }

    $('.showtip').tipsy({ gravity: autoGrav, opacity: 1.0, html: true });

    updateLoadingProgress(90, '정렬 기능 로딩 중⋯');
    await initSortable('#log-view');

    window.onbeforeunload = function() { return '변경 내용이 사라질 수 있습니다. 페이지를 나가시겠습니까?'; }

    $('.message a').each(function() { $(this).attr('target', '_blank'); });
    $('#section-edit').show();

    updateLoadingProgress(100, '편집 준비 완료!');
    await sleep(300);

    hideLoadingOverlay();
});

// 🔹 로딩 오버레이 생성
function showLoadingOverlay() {
    if ($('#loading-overlay').length === 0) {
        const overlay = $(`
            <div id="loading-overlay">
                <div style="text-align:center; width: 250px;">
                    <div id="loading-text">
                        로딩 중⋯
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 12px;">
                        <div id="loading-bar"></div>
                    </div>
                </div>
            </div>
        `);
        $('body').append(overlay);
    } else {
        $('#loading-overlay').show();
    }
}

// 🔹 진행률 업데이트
function updateLoadingProgress(percent, text) {
    $('#loading-bar').css('width', `${percent}%`);
    $('#loading-text').text(text);
}

// 🔹 오버레이 제거
function hideLoadingOverlay() {
    $('#loading-overlay').fadeOut(300, function() {
        $(this).remove();
    });
}

// 버튼 작동 방지
$('#log-view').on('click', '.message a[href^="!"], .message a[href^="~"]', function(e) { e.preventDefault(); });

// 핸들 - 이동
$('#log-view').on('mousedown', '.hdl-move', function() {
    saveState();
});

// 핸들 - 수정
$('#log-view').on('click', '.hdl-edit', function() {
    saveState();
    const $msg = $(this).closest('.message');
    const $controls = $msg.find('.hdl-body');

    if ($msg.find('textarea.inline-editor').length > 0) return;

    // 원본 HTML
    const originalHTML = $msg.clone().children('.hdl-body').remove().end().html().trim();

    if (originalHTML.includes('basicdiceroll')) {
        alert('편집을 지원하지 않는 주사위가 포함되어 있습니다.');
        return;
    }

    // 핸들 고정 & 이동 비활성화
    $msg.find('.hdl-body').addClass('active');

    // 원본 요소들 저장
    const avatarHTMLs = [];
    const tstampTexts = [];
    const tstampHTMLs = [];
    const byTexts = [];
    const byHTMLs = [];
    const spacerHTMLs = [];

    // 아바타 원본 저장
    originalHTML.replace(/<div[^>]*class="avatar"[^>]*>[\s\S]*?<\/div>/g, function(match) {
        avatarHTMLs.push(match);
        return match;
    });

    // 타임스탬프 원본 저장
    originalHTML.replace(/<span[^>]*class="tstamp"[^>]*>([\s\S]*?)<\/span>/g, function(match, txt) {
        tstampTexts.push(txt.trim());
        tstampHTMLs.push(match);
        return match;
    });

    // by 원본 저장
    originalHTML.replace(/<span[^>]*class="by"[^>]*>([\s\S]*?)<\/span>/g, function(match, txt) {
        byTexts.push(txt.trim());
        byHTMLs.push(match);
        return match;
    });

    // HTML → 토큰 텍스트 변환
    let tokenHTML = originalHTML
        .replace(/<div[^>]*class="avatar"[^>]*>[\s\S]*?<\/div>/g, '{{아바타}}')
        .replace(/<span[^>]*class="tstamp"[^>]*>([\s\S]*?)<\/span>/g, function(match, timeText) {
            return `{{시각: ${timeText.trim()}}}`;
        })
        .replace(/<span[^>]*class="by"[^>]*>([\s\S]*?)<\/span>/g, function(match, byText) {
            return `{{As: ${byText.trim()}}}`;
        })
        .replace(/<div[^>]*class="spacer"[^>]*><\/div>/g, '{{구분선}}');

    // textarea 표시
    const textarea = $(`<textarea class="inline-editor">${tokenHTML}</textarea>`);
    $msg.html(textarea).append($controls);
    textarea.focus();

    textarea.on('blur', function() {
        let edited = textarea.val();

        //구분선 복원
        edited = edited.replace('{{구분선}}', `<div class="spacer"></div>`);

        //아바타 복원
        avatarHTMLs.forEach(avHTML => {
            edited = edited.replace('{{아바타}}', avHTML);
        });

        // 타임스탬프 복원
        const editedTimes = [];
        edited.replace(/{{시각:\s*([^}]+)}}/g, (match, newTime) => {
            editedTimes.push(newTime.trim());
        });

        editedTimes.forEach((newTime, idx) => {
            edited = edited.replace(/{{시각:[^}]+}}/, `<span class="tstamp">${newTime}</span>`);
        });

        // As 복원
        const editedBy = [];
        edited.replace(/{{As:\s*([^}]+)}}/g, (match, newBy) => {
            editedBy.push(newBy.trim());
        });

        editedBy.forEach((newBy, idx) => {
            edited = edited.replace(/{{As:[^}]+}}/, `<span class="by">${newBy}</span>`);
        });

        $msg.html(edited).append($controls);

        // 핸들 고정 해제 & 이동 활성화
        $msg.find('.hdl-body').removeClass('active');
    });
});

// 핸들 - 복제
$('#log-view').on('click', '.hdl-copy', function() {
    saveState();
    $(this).closest('.message').after($(this).closest('.message').clone());
    $('.showtip').tipsy({ gravity: autoGrav, opacity: 1.0, html: true });
});

// 핸들 - 삭제
$('#log-view').on('click', '.hdl-delete', function() {
    if (confirm('이 메시지를 삭제하시겠습니까?')) {
        saveState();
        $(this).closest('.message').remove();
    }
});

// 아바타 선택
$('#avatar-list').on('click', 'img', function() {
    const avatarLink = this.src;
    $('#null-org').hide();
    $('#img-org').attr('src', avatarLink).show();
    $('#link-org').val(avatarLink);
    $('#link-chg').val('');
});

$('#link-chg').on('input', function() {
    const avatarLink = $(this).val();
    if (avatarLink === '') { 
        $('#img-chg').hide();
        $('#null-chg').show();
    } else {
        $('#null-chg').hide();
        $('#img-chg').attr('src', avatarLink).show();
    }
});

// 구글 드라이브 링크 변환
$('#avatar-ggl').on('click', function() {
    const avatarLink = $('#link-chg').val().replace('drive.google.com/file', 'lh3.googleusercontent.com').replace('/view?usp=drive_link', '').replace('/view?usp=sharing', '');
    $('#link-chg').val(avatarLink);
    $('#img-chg').attr('src', avatarLink);
});

// 아바타 바꾸기
$('#avatar-btn').on('click', function() {
    let find = $('#link-org').val();
    let replace = $('#link-chg').val();

    if (find === '') {
        alert('찾을 내용이 없습니다.');
        return;
    }

    saveState();
    $('#log-view').html(
        $('#log-view').html().replaceAll(find, replace)
    );
    $('#avatar-list').html(
        $('#avatar-list').html().replaceAll(find, replace)
    );
    $('#img-org').attr('src', replace);
    $('#img-chg').removeAttr('src').hide();
    $('#link-org').val(replace);
    $('#link-chg').val('');
    $('#null-chg').show();
});

// 일괄 바꾸기
$('#rpl-find').on('change', function() {
    const find = $(this).val();
    if (find === '') {
        $('#rpl-num').text('');
    } else {
        const count = find
        ? $('#log-view').html().split(find).length - 1
        : 0;

        $('#rpl-num').text(`${count}건 검색됨`);
    }
});

$('#rpl-btn').on('click', function() {
    const find = $('#rpl-find').val();
    const rpl = $('#rpl-replace').val();

    if (find === '') {
        alert('찾을 내용이 입력되지 않았습니다.');
        return;
    }

    saveState();
    $('#log-view').html(
        $('#log-view').html().replaceAll(find, rpl)
    );
});

// 일괄 삭제
$('#remove-ts').on('click', function() {
    if (confirm('타임스탬프를 모두 삭제하시겠습니까?')) {
        saveState();
        $('#log-view .message .tstamp').remove();
        $('#remove-ts').hide();
        $('#check-ts').show();
    }
});

$('#remove-hidden').on('click', function() {
    if (confirm('hidden message를 모두 삭제하시겠습니까?')) {
        saveState();
        $('#log-view .message.hidden-message').remove();
        $('#remove-hidden').hide();
        $('#check-hidden').show();
    }
});

// 템플릿 CSS 포함
$('#include-css').on('change', function() {
    if ($(this).is(':checked')) {
        if ($('#css-select').val() == '적용 중인 시트 템플릿 없음' && !$('#css-input').val()) {
            alert('적용 중인 템플릿이 없습니다.');
            $('#include-css').prop('checked', false);
        }
    }
});

// 백업용 CSS 다운로드
$('.css-download').on('click', function() {
    const blob = new Blob([extractedCss], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '[Rolleditor] ' + $('#css-view').text();
    a.click();
    URL.revokeObjectURL(url);
});

// HTML 추출
function saveHtml(styleTag) {
    const $content = $('#log-view').clone()
    $content.find('.hdl-body').remove();
    if ($('#include-css').is(':checked')) { 
        if ($content.find('style').length > 0) {
            if (confirm('기존 서식을 덮어쓸까요? 취소 시 기존 서식을 유지한 채 서식을 추가로 적용합니다.')) {
                $content.find('style').remove();
            }
        }
        $content.prepend(styleTag);
    }
    return $content.html();
}

// 현재 코드 복사
$('#copy-html').on('click', function() {
    htmlContent = saveHtml(styleTag);
    navigator.clipboard.writeText(htmlContent)
        .then(() => alert('HTML 내용이 복사되었습니다.'))
        .catch(() => alert('복사 실패'));
});

// HTML 파일로 저장
$('#download-html').on('click', function() {
    htmlContent = saveHtml(styleTag);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const textTitle = $('#log-view').text().replace(/\s+/g, ' ').trim().substr(0, 17);
    a.download = `[Rolleditor] ${textTitle}⋯.html`;
    a.click();
    URL.revokeObjectURL(url);
});

// TXT 파일로 저장
$('#download-txt').on('click', function() {
    htmlContent = saveHtml(styleTag);
    const blob = new Blob([htmlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const textTitle = $('#log-view').text().replace(/\s+/g, ' ').trim().substr(0, 17);
    a.download = `[Rolleditor] ${textTitle}⋯.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// 초기 로딩
$(document).ready(function() {
    attachHdl();
    $('#log-view').sortable({
        items: ".message",
        handle: ".hdl-move",
        cursor: "move",
        placeholder: "msg-placeholder",
        axis: "y"
    });

    $('.showtip').tipsy({ gravity: autoGrav, opacity: 1.0, html: true });
    $('.message a').each(function() { $(this).attr('target', '_blank'); });
    $('#undo-btn').hide();
});

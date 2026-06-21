let undoStack = [];
let redoStack = [];
let cssFile;
let styleTag;
let htmlContent;
let srcSet = new Set();

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

$(document).on('keydown', function (e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
});

// Undo/Redo 버튼
$('#undo-btn').on('click', undo);
$('#redo-btn').on('click', redo);

// 샘플 데이터 삭제
$('#html-text').one('click', function() {
    $(this).val('');
    $('#sample').css('opacity', '0');
    $('#start-edit').text('편집 시작');
})

// 시트 템플릿 자동 선택
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

$('#html-text').on('input', function() {
    if (!$('#custom').is('style')) {
        cssFile = null;
        const str = $(this).val();

        for (const [file, regex] of Object.entries(rule)) {
            if (regex.test(str)) {
                cssFile = file;
                break;
            } else {
                $('#css-img img').hide();
            }
        }

        $('#css-select').val(cssFile);
        if (sheet[cssFile]) {
            $('#css-img img').attr('src', sheet[cssFile]).show();
        }
    }
    $('#html-list').text('왼쪽에 코드를 붙여넣거나 여기에 HTML 파일을 업로드해 주세요.');
    $('#html-upload .upload-icon').show();
});

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
    if (!file.name.toLowerCase().endsWith('.html')) {
        alert('HTML 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
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

// 시트 템플릿 수동 선택
$('#css-select').on('change', function () {
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
    const file = event.target.files[0];
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
        styleTag = `<style id="custom">${extractedCss}</style>`;
        $('head style#custom').remove();
        $('head').append(styleTag);
    };
    
    reader.readAsText(file, 'utf-8');
    cssFile = null;
    $('#css-select option:eq(0)').prop('selected', true);
    $('#css-img img').hide();
    $('#css-img div').text('커스텀 시트는 미리보기를 제공하지 않습니다.');
    $('#css-upload .upload-icon').hide();
    $('#css-list').text('현재 파일: ' + file.name);
    $('#css-view').text(file.name);
    $('.css-download').show();
}

// 파일 바꾸기
$('#show-file').on('click', function () {
    $('#section-edit').hide();
    $('#section-upload').show();
});

// 커스텀 시트 없는 경우 CSS 후속 작업
function internalcss() {
    $('#css-sheet').attr('href', cssFile);
    $('#css-view').text(cssFile);
    styleTag = null;

    fetch(`./${cssFile}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(cssContent => {
            styleTag = `<style>\n${cssContent}\n</style>`;
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

    $('#log-view .message .avatar img').each(function () {
    const src = $(this).attr('src');
    if (src) {
        srcSet.add(src);
    }
    });

    $('#avatar-list').empty();

    // img 추가
    srcSet.forEach(function (src) {
    $('<img>', {
        src: src
    }).appendTo('#avatar-list');
    });
}

// 🔹 sleep 유틸
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 attachControls 비동기 버전 (배치 처리)
async function attachHdl() {
    const messages = $('#log-view .message');
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        batch.each(function () {
            const $msg = $(this);
            if ($msg.find('.hdl-body').length === 0) {
                const controls = $(`
                    <div class="hdl-body">
                        <div class="hdl-move"></div>
                        <div class="hdl-box">
                        <button class="hdl-edit" />
                        <button class="hdl-copy" />
                        <button class="hdl-delete" />
                        </div>
                    </div>
                `);
                $msg.append(controls);
            }
        });
        updateLoadingProgress(66 + Math.floor((i / messages.length) * 20), `편집 기능 로딩 중... (${i}/${messages.length})`);
        await sleep(10); // 브라우저 숨 쉴 시간
    }
}

// 🔹 정렬 기능 초기화 비동기
async function initSortableAsync(selector) {
    // DOM 안정화 잠깐 대기
    await sleep(50);

    // 실제 sortable 초기화
    const container = $(selector);
    container.sortable({
        items: ".message",
        handle: ".hdl-move",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y",
    });
}

// 편집 시작
$('#start-edit').on('click', async function () {
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
    updateLoadingProgress(0, 'HTML 불러오는 중…');
    await sleep(50); // UI 렌더링 여유

    $('#section-upload').hide();
    $('#log-view').empty();
    const htmlCode = $('#html-text').val();
    $('#log-view').html(htmlCode);

    updateLoadingProgress(33, '코드 압축 중…');
    await sleep(30);
    compress();
    avatarimg();

    updateLoadingProgress(66, '편집 기능 로딩 중…');
    await attachHdl();
    if (cssFile) { internalcss(); }

    if ($('#log-view .tstamp').length > 0) {
        $('#check-ts').hide();
        $('#remove-ts').show();
    }

    if ($('#log-view .hidden-message').length > 0) {
        $('#check-hidden').hide();
        $('#remove-hidden').show();
    }

    updateLoadingProgress(90, '정렬 기능 로딩 중…');
    await initSortableAsync('#log-view');

    window.onbeforeunload = function () {
        return '변경 내용이 사라질 수 있습니다. 페이지를 나가시겠습니까?';
    }

    $('#section-edit').show();

    updateLoadingProgress(100, '편집 준비 완료!');
    await sleep(300);

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });

    hideLoadingOverlay();
});

// 🔹 로딩 오버레이 생성
function showLoadingOverlay() {
    if ($('#loading-overlay').length === 0) {
        const overlay = $(`
            <div id="loading-overlay">
                <div style="text-align:center; width: 250px;">
                    <div id="loading-text">
                        로딩 중…
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
    $('#loading-overlay').fadeOut(300, function () {
        $(this).remove();
    });
}

// 핸들 - 이동
$(document).on('mousedown', '.hdl-move', function() {
    saveState();
});

// 핸들 - 수정
$(document).on('click', '.hdl-edit', function () {
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
    originalHTML.replace(/<div[^>]*class="avatar"[^>]*>[\s\S]*?<\/div>/g, function (match) {
        avatarHTMLs.push(match);
        return match;
    });

    // 타임스탬프 원본 저장
    originalHTML.replace(/<span[^>]*class="tstamp"[^>]*>([\s\S]*?)<\/span>/g, function (match, txt) {
        tstampTexts.push(txt.trim());
        tstampHTMLs.push(match);
        return match;
    });

    // by 원본 저장
    originalHTML.replace(/<span[^>]*class="by"[^>]*>([\s\S]*?)<\/span>/g, function (match, txt) {
        byTexts.push(txt.trim());
        byHTMLs.push(match);
        return match;
    });

    // HTML → 토큰 텍스트 변환
    let tokenHTML = originalHTML
        .replace(/<div[^>]*class="avatar"[^>]*>[\s\S]*?<\/div>/g, '{{아바타}}')
        .replace(/<span[^>]*class="tstamp"[^>]*>([\s\S]*?)<\/span>/g, function (match, timeText) {
            return `{{시각: ${timeText.trim()}}}`;
        })
        .replace(/<span[^>]*class="by"[^>]*>([\s\S]*?)<\/span>/g, function (match, byText) {
            return `{{As: ${byText.trim()}}}`;
        })
        .replace(/<div[^>]*class="spacer"[^>]*><\/div>/g, '{{구분선}}');

    // textarea 표시
    const textarea = $(`<textarea class="inline-editor">${tokenHTML}</textarea>`);
    $msg.html(textarea).append($controls);
    textarea.focus();

    textarea.on('blur', function () {
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
$(document).on('click', '.hdl-copy', function () {
    saveState();
    $(this).closest('.message').after($(this).closest('.message').clone());
});

// 핸들 - 삭제
$(document).on('click', '.hdl-delete', function () {
    if (confirm('이 메시지를 삭제하시겠습니까?')) {
        saveState();
        $(this).closest('.message').remove();
    }
});

// 아바타 선택
$('#avatar-list').on('click', 'img', function() {
    const avatarLink = this.src;
    $('#img-org').attr('src', avatarLink);
    $('#link-org').val(avatarLink);
    $('#link-chg').val('');
});

$('#link-chg').on('change', function() {
    const avatarLink = $(this).val();
    $('#img-chg').attr('src', avatarLink);
});

// 구글 드라이브 링크 변환
$('#avatar-ggl').on('click', function () {
    const avatarLink = $('#link-chg').val().replace('drive.google.com/file', 'lh3.googleusercontent.com').replace('/view?usp=drive_link', '');
    $('#link-chg').val(avatarLink);
    $('#img-chg').attr('src', avatarLink);
});

// 아바타 변경
$('#avatar-btn').on('click', function () {
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
    $('#img-chg').removeAttr('src');
    $('#link-org').val(replace);
    $('#link-chg').val('');
});

// 일괄 삭제
$('#remove-ts').on('click', function () {
    if (confirm('타임스탬프를 모두 삭제하시겠습니까?')) {
        saveState();
        $('#log-view .message .tstamp').remove();
        $('#remove-ts').hide();
        $('#check-ts').show();
    }
});

$('#remove-hidden').on('click', function () {
    if (confirm('hidden message를 모두 삭제하시겠습니까?')) {
        saveState();
        $('#log-view .message.hidden-message').remove();
        $('#remove-hidden').hide();
        $('#check-hidden').show();
    }
});

// 템플릿 CSS 포함
$('#include-css').on('change', function () {
    if ($(this).is(':checked')) {
        if ($('#css-select').val() == '적용 중인 템플릿 없음' && !$('#css-input').val()) {
            alert('적용 중인 템플릿이 없습니다.');
            $('#include-css').prop('checked', false);
        }
    }
});

// 백업용 CSS 다운로드
$('.css-download').on('click', function () {
    const blob = new Blob([extractedCss], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-' + $('#css-view').text();
    a.click();
    URL.revokeObjectURL(url);
});

// 현재 코드 복사
$('#copy-html').on('click', function () {
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.hdl-body').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.hdl-body').remove().end().html(); }
    navigator.clipboard.writeText(htmlContent)
        .then(() => alert('HTML 내용이 복사되었습니다.'))
        .catch(() => alert('복사 실패'));
});

// HTML 파일로 저장
$('#download-html').on('click', function () {
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.hdl-body').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.hdl-body').remove().end().html(); }
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.html';
    a.click();
    URL.revokeObjectURL(url);
});

$(document).ready(function () {
    attachHdl();

    $('#log-view').sortable({
        items: ".message",
        handle: ".hdl-move",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y"
    });

    $('#what').click(function (event) {
        event.stopPropagation();
        $('.pop-up').addClass('active');
    });

    $(document).click(function () {
        $('.pop-up').removeClass('active');
    });

    $('#rpl-btn').click(function () {
        let find = $('#rpl-find').val();
        let rpl = $('#rpl-replace').val();

        if (find === '') {
            alert('찾을 내용이 없습니다.');
            return;
        }

        saveState();
        $('#log-view').html(
            $('#log-view').html().replaceAll(find, rpl)
        );
    });

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });
    $('#undo-btn').hide();
});
let undoStack = [];
let redoStack = [];
let cssFile;
let styleTag;
let htmlContent;

// HTML 엔티티 변환
function encodeHTML(str) { return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function decodeHTML(str) { const t = document.createElement('textarea'); t.innerHTML = str; return t.value; }

// 메뉴 전환
$('#show-file').on('click', function () {
    $('#section-edit').hide();
    $('#section-upload').show();
});

// 🔹 상태 저장
function saveState() {
    undoStack.push($('#log-view').html());
    if (undoStack.length > 20) undoStack.shift();
    redoStack = [];
}

// 🔹 상태 복원
function restoreState(html) {
    $('#log-view').html(html);
    attachControls();
}

// 🔹 Undo / Redo
function undo() {
    if (undoStack.length === 0) return;
    redoStack.push($('#log-view').html());
    const prev = undoStack.pop();
    restoreState(prev);
}
function redo() {
    if (redoStack.length === 0) return;
    undoStack.push($('#log-view').html());
    const next = redoStack.pop();
    restoreState(next);
}

// 🔹 단축키
$(document).on('keydown', function (e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
});

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

function autocss() {
    if (!$('#log-css').val()) {
        cssFile = null;
        const str = $(this).val();

        for (const [file, regex] of Object.entries(rule)) {
            if (regex.test(str)) {
                cssFile = file;
                break;
            }
        }

        $('#css-select').val(cssFile);
    }
}

$('#log-text').on('input', autocss);

// 저장된 HTML 파일 올리기
$('#log-html').on('change', function (event) {
    const file = event.target.files[0];
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
        $('#log-text').val(e.target.result).trigger('input');
    };
    reader.readAsText(file, 'utf-8');
});

// 시트 템플릿 수동 선택
$('#css-select').on('change', function () {
    cssFile = this.value;
    if (!cssFile) return;
    const logCss = $('#log-css').value;
    if (logCss) {
        if (confirm('업로드한 커스텀 시트 CSS가 사라집니다. 계속하시겠습니까?')) {
            logCss.value = null;
            $('.css-download').hide();
        } else return;
    }
})

// 커스텀 시트 CSS 올리기
$('#log-css').on('change', function (event) {
    cssFile = null;
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css')) {
        alert('CSS 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
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
        styleTag = null;
        styleTag = `<style>${extractedCss}</style>`;
        $('head').append(styleTag);
        $('#css-select option:eq(0)').prop('selected', true);
    };

    reader.readAsText(file, 'utf-8');
    $('#css-view').text(file.name);
    $('.css-download').show();
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
            styleTag = `<style id="loaded-style">\n${cssContent}\n</style>`;
        });
}

// 압축
function compress() {
    $('#log-view .message .flyout').remove();
    $('#log-view .message').removeAttr('data-messageid');
}

const srcSet = new Set();

// src 수집 (중복 제거)
function avatarimg() {
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
async function attachControlsAsync() {
    const messages = $('#log-view .message');
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        batch.each(function () {
            const $msg = $(this);
            if ($msg.find('.msg-controls').length === 0) {
                const controls = $(`
                    <div class="msg-controls">
                        <div class="move-handle"></div>
                        <button class="edit-btn">편집</button>
                        <button class="delete-btn">삭제</button>
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
        handle: ".move-handle",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y",
        stop: saveState
    });
}

// 편집 시작
$('#show-html').on('click', async function () {
    if (!$('#log-text').val().includes('div class="message')) {
        alert('롤20 형식의 HTML이 아닙니다.');
        return;
    }
    if ($('#log-text').val().includes('class="no-edit"')) {
        alert('편집할 로그를 입력해 주세요.');
        return;
    }

    showLoadingOverlay();
    updateLoadingProgress(0, "HTML 불러오는 중...");
    await sleep(50); // UI 렌더링 여유

    $('#section-upload').hide();
    $('#log-view').empty();
    const htmlCode = $('#log-text').val();
    $('#log-view').html(htmlCode);

    updateLoadingProgress(33, "코드 압축 중...");
    await sleep(30);
    compress();
    avatarimg();

    updateLoadingProgress(66, "편집 기능 로딩 중...");
    await attachControlsAsync();
    if (cssFile) { internalcss(); }

    updateLoadingProgress(90, "정렬 기능 로딩 중...");
    await initSortableAsync("#log-view");

    window.onbeforeunload = function () {
        return "변경 내용이 사라질 수 있습니다. 페이지를 나가시겠습니까?";
    }

    $('#section-edit').show();
    $('.tool-btn').show();

    if ($('#log-view .tstamp').length > 0) {
        $('#check-ts').hide();
        $('#remove-ts').show();
    }

    updateLoadingProgress(100, "편집 준비 완료!");
    await sleep(300);

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });

    hideLoadingOverlay();
    saveState();
});

// 🔹 로딩 오버레이 생성
function showLoadingOverlay() {
    if ($('#loading-overlay').length === 0) {
        const overlay = $(`
            <div id="loading-overlay" style="
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(3px);
                color: white;
                font-family: sans-serif;
            ">
                <div style="text-align:center; width: 250px;">
                    <div id="loading-text" style="margin-bottom: 12px; font-size: 1.2em;">
                        로딩 중...
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 12px;">
                        <div id="loading-bar" style="
                            width: 0%;
                            height: 12px;
                            background: #4ade80;
                            border-radius: 10px;
                            transition: width 0.3s ease;
                        "></div>
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

// 🔹 .message 컨트롤 추가
function attachControls() {
    $('#log-view .message').each(function () {
        const $msg = $(this);
        if ($msg.find('.msg-controls').length === 0) {
            const controls = $(`
            <div class="msg-controls">
            <div class="move-handle"></div>
            <button class="edit-btn">편집</button>
            <button class="delete-btn">삭제</button>
            </div>
            `);
            $msg.append(controls);
        }
    });
}

// 🔹 편집 (div 내부 textarea)
$(document).on('click', '.edit-btn', function () {
    const $msg = $(this).closest('.message');
    const $controls = $msg.find('.msg-controls');

    if ($msg.find('textarea.inline-editor').length > 0) return;

    // 원본 HTML
    const originalHTML = $msg.clone().children('.msg-controls').remove().end().html().trim();

    if (originalHTML.includes('basicdiceroll')) {
        alert('편집을 지원하지 않는 주사위가 포함되어 있습니다.');
        return;
    }

    // 핸들 비활성화
    $msg.find('.msg-controls .move-handle').hide();

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

    // 시각 원본 저장
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
        .replace(/<div[^>]*class="avatar"[^>]*>[\s\S]*?<\/div>/g, "{{아바타}}")
        .replace(/<span[^>]*class="tstamp"[^>]*>([\s\S]*?)<\/span>/g, function (match, timeText) {
            return `{{시각: ${timeText.trim()}}}`;
        })
        .replace(/<span[^>]*class="by"[^>]*>([\s\S]*?)<\/span>/g, function (match, byText) {
            return `{{As: ${byText.trim()}}}`;
        })
        .replace(/<div[^>]*class="spacer"[^>]*><\/div>/g, "{{구분선}}");

    // textarea 표시
    const textarea = $(`<textarea class="inline-editor">${tokenHTML}</textarea>`);
    $msg.html(textarea).append($controls);
    textarea.focus();

    textarea.on('blur', function () {
        let edited = textarea.val();  // 사용자가 수정한 텍스트

        // ✅ 사용자 텍스트 그대로 기반
        let rebuiltHTML = edited;

        // --- 구분선 복원 ---
        rebuiltHTML = rebuiltHTML.replace("{{구분선}}", `<div class="spacer"></div>`);

        // --- 아바타 복원 ---
        avatarHTMLs.forEach(avHTML => {
            rebuiltHTML = rebuiltHTML.replace("{{아바타}}", avHTML);
        });

        // --- 시각 토큰 복원 ---
        const editedTimes = [];
        edited.replace(/{{시각:\s*([^}]+)}}/g, (match, newTime) => {
            editedTimes.push(newTime.trim());
        });

        editedTimes.forEach((newTime, idx) => {
            rebuiltHTML = rebuiltHTML.replace(/{{시각:[^}]+}}/, `<span class="tstamp">${newTime}</span>`);
        });

        // --- As 토큰 복원 ---
        const editedBy = [];
        edited.replace(/{{As:\s*([^}]+)}}/g, (match, newBy) => {
            editedBy.push(newBy.trim());
        });

        editedBy.forEach((newBy, idx) => {
            rebuiltHTML = rebuiltHTML.replace(/{{As:[^}]+}}/, `<span class="by">${newBy}</span>`);
        });

        $msg.html(rebuiltHTML).append($controls);
        attachControls();

        // 핸들 활성화
        $msg.find('.msg-controls .move-handle').show();
        saveState();
    });
});

// 🔹 삭제
$(document).on('click', '.delete-btn', function () {
    if (confirm('이 메시지를 삭제하시겠습니까?')) {
        saveState();
        $(this).closest('.message').remove();
    }
});

// 🔹 Undo/Redo 버튼
$('#undo-btn').on('click', undo);
$('#redo-btn').on('click', redo);

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

    if (find === "") {
        alert('찾을 내용이 없습니다.');
        return;
    }

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

// 템플릿 CSS 포함
$('#include-css').on('change', function () {
    if ($(this).is(':checked')) {
        if ($('#css-select').val() == '적용 중인 템플릿 없음' && !$('#log-css').val()) {
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
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    navigator.clipboard.writeText(htmlContent)
        .then(() => alert('HTML 내용이 복사되었습니다.'))
        .catch(() => alert('복사 실패'));
});

// HTML 파일로 저장
$('#download-html').on('click', function () {
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.html';
    a.click();
    URL.revokeObjectURL(url);
});

$(document).ready(function () {
    attachControlsAsync();
    $("#log-view").sortable({
        items: ".message",
        handle: ".move-handle",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y",
        stop: saveState
    });

    $('#what').click(function (event) {
        event.stopPropagation();
        $('.pop-up').addClass('active');
    });

    $(document).click(function () {
        $('.pop-up').removeClass('active');
    });

    $('#replaceBtn').click(function () {
        let find = $('#findText').val();
        let replace = $('#replaceText').val();

        if (find === "") {
            alert('찾을 내용이 없습니다.');
            return;
        }

        $('#log-view').html(
            $('#log-view').html().replaceAll(find, replace)
        );
    });

    $('#eraser').click(function () {
        $('#log-text').empty();
        $('#sample').hide();
    });

    $('#remove-ts').click(function () {
        if (confirm('타임스탬프를 삭제하시겠습니까?')) {
            saveState();
            $('#log-view .message .tstamp').remove();
            $('#remove-ts').hide();
            $('#check-ts').show();
        }
    });

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });
});
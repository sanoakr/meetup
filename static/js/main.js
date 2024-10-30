document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var memberNameInput = document.getElementById('member_name');
    var memberName = '';

    // 名前を入力後に変更不可にする
    memberNameInput.addEventListener('blur', function() {
        if (memberNameInput.value.trim() !== '') {
            memberName = memberNameInput.value.trim();
            memberNameInput.setAttribute('disabled', 'true'); // 名前入力欄を無効化
            updateEventColors();
        }
    });

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        selectable: true,
        locale: 'ja',
        events: '/get_schedules/' + group_id,
        eventOverlap: true,
        validRange: {
            start: new Date()
        },
        businessHours: {
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startTime: '09:00',
            endTime: '20:00'
        },
        slotDuration: '01:00:00',
        allDaySlot: false,
        selectConstraint: 'businessHours',
        select: function(info) {
            if (!memberName) {
                alert('名前を入力してください。');
                return;
            }

            var hasCandidate = false;
            var events = calendar.getEvents();
            events.forEach(function(event) {
                if (event.start.getTime() === info.start.getTime() &&
                    event.end.getTime() === info.end.getTime() &&
                    event.title === memberName) {
                    hasCandidate = true;
                }
            });

            if (hasCandidate) {
                alert('この時間枠には既に候補を入力しています。');
                return;
            }

            var eventData = {
                title: memberName,
                start: info.startStr,
                end: info.endStr,
                color: stringToColor(memberName)
            };
            calendar.addEvent(eventData);
            fetch('/add_schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    group_id: group_id,
                    member_name: memberName,
                    start: info.startStr,
                    end: info.endStr
                }),
            })
            .then(response => {
                if (!response.ok) {
                    response.text().then(text => alert(text));
                } else {
                    updateFinalCandidates();
                }
            });
        },
        eventClick: function(info) {
            if (info.event.title === memberName) {
                if (confirm('この候補を削除しますか？')) {
                    fetch('/delete_schedule', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            group_id: group_id,
                            member_name: memberName,
                            start: info.event.start.toISOString(),
                            end: info.event.end.toISOString()
                        }),
                    })
                    .then(response => {
                        if (!response.ok) {
                            alert('エラーが発生しました。');
                        } else {
                            info.event.remove();
                            updateFinalCandidates();
                        }
                    });
                }
            } else {
                var hasCandidate = false;
                var events = calendar.getEvents();
                events.forEach(function(event) {
                    if (event.start.getTime() === info.event.start.getTime() &&
                        event.end.getTime() === info.event.end.getTime() &&
                        event.title === memberName) {
                        hasCandidate = true;
                    }
                });

                if (hasCandidate) {
                    alert('この時間枠には既に候補を入力しています。');
                    return;
                }

                var eventData = {
                    title: memberName,
                    start: info.event.start,
                    end: info.event.end,
                    color: stringToColor(memberName)
                };
                calendar.addEvent(eventData);
                fetch('/add_schedule', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        group_id: group_id,
                        member_name: memberName,
                        start: info.event.start.toISOString(),
                        end: info.event.end.toISOString()
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        response.text().then(text => alert(text));
                    } else {
                        updateFinalCandidates();
                    }
                });
            }
        },
        eventContent: function(arg) {
            return { html: '<div>' + arg.event.title + '</div>' };
        },
        eventDidMount: function(info) {
            var memberName = info.event.title;
            info.el.style.backgroundColor = stringToColor(memberName);
        }
    });
    calendar.render();

    function updateEventColors() {
        var events = calendar.getEvents();
        events.forEach(function(event) {
            if (event.title === memberName) {
                event.setProp('color', stringToColor(memberName));
            }
        });
    }

    function updateFinalCandidates() {
        fetch('/final_candidates/' + group_id)
        .then(response => response.json())
        .then(data => {
            var list = document.getElementById('final_candidates');
            list.innerHTML = '';
            if (data.length === 0) {
                list.innerHTML = '<li>候補日がありません。</li>';
                return;
            }
            var maxCount = data[0][1];
            data.forEach(function(item) {
                var li = document.createElement('li');
                var dateStr = new Date(item[0]).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                    hour: 'numeric',
                    minute: 'numeric'
                });
                li.textContent = dateStr + ' - 希望者数: ' + item[1];
                if (item[1] === maxCount) {
                    li.classList.add('highlight');
                }
                list.appendChild(li);
            });
        });
    }

    function stringToColor(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var color = '#';
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    updateFinalCandidates();
});
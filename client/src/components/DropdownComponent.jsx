import React, {useContext, useEffect} from "react";
import "../style/Dropdown.sass";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faArrowDown,
    faArrowUp, faClock, faClose, faFileExport,
    faGear, faInfo,
    faKey,
    faPause,
    faPingPongPaddleBall,
    faPlay,
    faServer, faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons";
import {DialogContext} from "../context/DialogContext";
import {ConfigContext} from "../context/ConfigContext";
import {StatusContext} from "../context/StatusContext";

let icon;

export const toggleDropdown = (setIcon) => {
    if (setIcon) icon = setIcon;
    let classList = document.getElementById("dropdown").classList;
    if (classList.contains("dropdown-invisible")) {
        classList.remove("dropdown-invisible");
        icon(faClose);
    } else {
        classList.add("dropdown-invisible");
        icon(faGear);
    }
}

function DropdownComponent() {

    const reloadConfig = useContext(ConfigContext)[1];
    const [status, updateStatus] = useContext(StatusContext);
    const [setDialog] = useContext(DialogContext);

    let headers = localStorage.getItem("password") ? {password: localStorage.getItem("password")} : {};
    headers['content-type'] = 'application/json';

    useEffect(() => {
        const onPress = event => {
            if (event.code === "Escape" && !document.getElementById("dropdown").classList.contains("dropdown-invisible"))
                toggleDropdown(icon);
        }
        document.addEventListener("keyup", onPress);
        return () => document.removeEventListener("keyup", onPress);
    }, []);

    const patchDialog = (path, dialog, toggle = true) => {
        if (toggle) toggleDropdown();
        fetch(path, {headers}).then(res => res.json())
            .then(value => setDialog({
                ...dialog(value.value),
                onSuccess: value => {
                    fetch(path, {headers, method: "PATCH", body: JSON.stringify({value})})
                        .then(() => showFeedback());
                }
            }));
    }

    const showFeedback = (customText, reload = true) => {
        setDialog({
            title: "MySpeed", description: customText || <>Deine Änderungen wurden übernommen.</>, buttonText: "Okay",
            onSuccess: () => reload ? reloadConfig() : "", onClose: () => reloadConfig()
        });
    }

    const updatePing = async () => {
        patchDialog("/api/config/ping", (value) => ({
            title: "Optimalen Ping setzen (ms)", placeholder: "Ping", value
        }));
    }


    const updateDownload = async () => {
        patchDialog("/api/config/download", (value) => ({
            title: "Optimalen Down-Speed setzen (Mbit/s)", placeholder: "Down-Speed", value
        }));
    }

    const updateUpload = async () => {
        patchDialog("/api/config/upload", (value) => ({
            title: "Optimalen Up-Speed setzen (Mbit/s)", placeholder: "Up-Speed", value
        }));
    }

    const updatePassword = async () => {
        toggleDropdown();
        setDialog({
            title: "Neues Passwort festlegen",
            placeholder: "Neues Passwort",
            type: "password",
            unsetButton: true,
            unsetButtonText: "Sperre aufheben",
            onClear: () => {
                fetch("/api/config/password", {headers: headers, method: "PATCH", body: JSON.stringify({value: "none"})})
                    .then(() => showFeedback(<>Die Passwortsperre wurde aufgehoben und das festgelegte Passwort wurde entfernt.</>, false));
                localStorage.removeItem("password");
            },
            onSuccess: value => {
                fetch("/api/config/password", {headers: headers, method: "PATCH", body: JSON.stringify({value: value})})
                    .then(() => showFeedback(undefined, false));
                localStorage.setItem("password", value);
            }
        })
    }

    const updateServer = () => {
        toggleDropdown();

        let servers = {};
        fetch("/api/info/server", {headers: headers})
            .then(res => res.json())
            .then(json => servers = json)
            .then(() => fetch("/api/config/serverId", {headers: headers}).then(res => res.json())
                .then(async server => setDialog({
                    title: "Speedtest-Server setzen",
                    select: true,
                    selectOptions: servers,
                    value: server.value,
                    unsetButton: true,
                    unsetButtonText: "Manuell festlegen",
                    onClear: () => updateServerManually(),
                    onSuccess: value => {
                        fetch("/api/config/serverId", {headers: headers, method: "PATCH", body: JSON.stringify({value: value})})
                            .then(() => showFeedback(undefined, false));
                    }
                })));
    }

    const updateServerManually = () => {
        patchDialog("/api/config/serverId", (value) => ({
            title: "Speedtest-Server setzen", placeholder: "Server-ID", type: "number", value: value,
        }), false);
    }

    function togglePause() {
        toggleDropdown();
        if (!status.paused) {
            setDialog({
                title: "Speedtests pausieren für...",
                placeholder: "Stunden",
                type: "number",
                buttonText: "Pausieren",
                unsetButton: true,
                unsetButtonText: "Manuell freigeben",
                onClear: async () => {
                    fetch("/api/speedtests/pause", {headers: headers, method: "POST",
                        body: JSON.stringify({resumeIn: -1})}).then(() => updateStatus());
                },
                onSuccess: async hours => {
                    fetch("/api/speedtests/pause", {headers: headers, method: "POST",
                        body: JSON.stringify({resumeIn: hours})}).then(() => updateStatus());
                }
            });
        } else fetch("/api/speedtests/continue", {headers: headers, method: "POST"})
            .then(() => updateStatus());
    }

    const showCredits = () => {
        toggleDropdown();
        setDialog({title: "MySpeed", description: <><a href="https://github.com/gnmyt/myspeed" target="_blank" rel="noreferrer">MySpeed</a> wird von GNMYT bereitgestellt
                und verwendet die <a href="https://www.speedtest.net/apps/cli" target="_blank" rel="noreferrer">Speedtest-CLI</a> von Ookla.</>, buttonText: "Schließen"});
    }

    const recommendedSettings = async () => {
        toggleDropdown();
        fetch("/api/recommendations", {headers: headers}).then(res => res.json())
            .then(values => values.message !== undefined ? setDialog({
                title: "Automatische Empfehlungen",
                description: <>Du musst mindestens 10 Tests machen, damit ein Durchschnitt ermittelt werden kann. Ob die
                    Tests manuell oder automatisch durchgeführt wurden ist egal.
                </>,
                buttonText: "Okay"
            }) : setDialog({
                title: "Automatische Empfehlungen setzen?",
                description: <>Anhand der letzten 10 Testergebnisse wurde festgestellt, dass der optimale Ping bei <span
                    className="dialog-value">
                    {values.ping} ms</span>, der Download bei <span
                    className="dialog-value">{values.download} Mbit/s </span>
                    und der Upload bei <span className="dialog-value">{values.upload} Mbit/s</span> liegt. <br/>
                    Orientiere dich am besten an deinem Internetvertrag und übernehme es nur, wenn es mit dem
                    übereinstimmt.</>,
                buttonText: "Ja, übernehmen",
                onSuccess: async () => {
                    await fetch("/api/config/ping", {headers: headers, method: "PATCH", body: JSON.stringify({value: values.ping})});
                    await fetch("/api/config/download", {headers: headers, method: "PATCH", body: JSON.stringify({value: values.download})});
                    await fetch("/api/config/upload", {headers: headers, method: "PATCH", body: JSON.stringify({value: values.upload})});
                    showFeedback();
                }
            }));
    }

    function exportDialog() {
        toggleDropdown();
        setDialog({
            select: true,
            title: "Speedtests exportieren",
            buttonText: "Herunterladen",
            value: "json",
            selectOptions: {
                json: "JSON-Datei",
                csv: "CSV-Datei"
            },
            onSuccess: value => {
                fetch("/api/export/" + value, {headers: headers})
                    .then(async res => {
                        let element = document.createElement('a');
                        let url = res.headers.get('Content-Disposition').split('filename=')[1];
                        element.setAttribute("download", url.replaceAll("\"", ""));
                        res.blob().then(async blob => {
                            element.href = window.URL.createObjectURL(blob);
                            document.body.appendChild(element);
                            element.click();
                            element.remove();
                        });
                    });
            }
        });
    }

    const updateLevel = async () => {
        toggleDropdown();
        fetch("/api/config/timeLevel", {headers: headers}).then(res => res.json())
            .then(level => setDialog({
                title: "Test-Häufigkeit einstellen",
                select: true,
                selectOptions: {
                    1: "Durchgehend (jede Minute)",
                    2: "Sehr häufig (alle 30 Minuten)",
                    3: "Standard (jede Stunde)",
                    4: "Selten (alle 3 Stunden)",
                    5: "Sehr selten (alle 6 Stunden)"
                },
                value: level.value,
                onSuccess: value => {
                    fetch("/api/config/timeLevel", {headers: headers, method: "PATCH", body: JSON.stringify({value: value})})
                        .then(() => showFeedback(undefined, false));
                }
            }));
    }

    return (
        <div className="dropdown dropdown-invisible" id="dropdown">
            <div className="dropdown-content">
                <h2>Einstellungen</h2>
                <div className="dropdown-entries">
                    <div className="dropdown-item" onClick={updatePing}>
                        <FontAwesomeIcon icon={faPingPongPaddleBall}/>
                        <h3>Optimaler Ping</h3>
                    </div>
                    <div className="dropdown-item" onClick={updateUpload}>
                        <FontAwesomeIcon icon={faArrowUp}/>
                        <h3>Optimaler Up-Speed</h3>
                    </div>
                    <div className="dropdown-item" onClick={updateDownload}>
                        <FontAwesomeIcon icon={faArrowDown}/>
                        <h3>Optimaler Down-Speed</h3>
                    </div>
                    <div className="dropdown-item" onClick={recommendedSettings}>
                        <FontAwesomeIcon icon={faWandMagicSparkles}/>
                        <h3>Optimale Werte</h3>
                    </div>
                    <div className="center">
                        <hr className="dropdown-hr"/>
                    </div>
                    <div className="dropdown-item" onClick={updateServer}>
                        <FontAwesomeIcon icon={faServer}/>
                        <h3>Server wechseln</h3>
                    </div>
                    <div className="dropdown-item" onClick={updatePassword}>
                        <FontAwesomeIcon icon={faKey}/>
                        <h3>Passwort ändern</h3>
                    </div>
                    <div className="dropdown-item" onClick={updateLevel}>
                        <FontAwesomeIcon icon={faClock}/>
                        <h3>Häufigkeit einstellen</h3>
                    </div>
                    <div className="dropdown-item" onClick={exportDialog}>
                        <FontAwesomeIcon icon={faFileExport}/>
                        <h3>Tests exportieren</h3>
                    </div>
                    <div className="dropdown-item" onClick={togglePause}>
                        <FontAwesomeIcon icon={status.paused ? faPlay : faPause}/>
                        <h3>{status.paused ? "Speedtests fortsetzen" : "Speedtests pausieren"}</h3>
                    </div>
                    <div className="dropdown-item" onClick={showCredits}>
                        <FontAwesomeIcon icon={faInfo}/>
                        <h3>Info</h3>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DropdownComponent;
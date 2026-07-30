import "./TitleBar.css";
import logo from "../assets/logo.png";

export default function TitleBar() {
    return (
        <div className="titlebar">

            <div className="left">

                 <img src={logo} className="logo" alt="Logo" />

                <span className="title">
                    SysteGo
                </span>

            </div>

            <div className="right">

                <button
                    className="menu"
                >
                    ⋮
                </button>

                <button
                    onClick={() => window.electronAPI.minimize()}
                >
                    ─
                </button>

                <button
                    onClick={() => window.electronAPI.maximize()}
                >
                    □
                </button>

                <button
                    className="close"
                    onClick={() => window.electronAPI.close()}
                >
                    ✕
                </button>

            </div>

        </div>
    );
}
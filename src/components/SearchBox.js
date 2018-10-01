import React, { Component } from 'react';

class SearchBox extends Component {

    componentDidMount() {
        window.addEventListener('keydown', this.handleKeyPress)
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleKeyPress)
    }

    handleKeyPress = (e) => {
        if (e.keyCode === 27) {
            this.inputRef.blur()
        }
    }

    render() {
        const { name, type, label, value, onChange, required } = this.props;
        return (
            <div className="input-div">
                <input
                    id={name}
                    ref={(ref) => this.inputRef = ref}
                    className="input-text"
                    name={name}
                    type={type || "text"}
                    required={required || true}
                    autoComplete="off"
                    value={value}
                    onChange={(e) => {
                        onChange && onChange(e)
                    }} />
                <label htmlFor={name} className="input-label">{label}</label>
            </div>
        );
    }
}

export { SearchBox };

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import warning from 'fbjs/lib/warning';
import emitter from "./emitter";
import Variant from "./Variant";

export default class CoreExperiment extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func
    ]).isRequired
  };

  win = () => {
    emitter.emitWin(this.props.name);
  };

  state = {};

  displayName = "Pushtell.CoreExperiment";

  constructor(props) {
    super();
    this.state.rawChildren = props.children;

    let children = {};
    React.Children.forEach(props.children, element => {
      if (!React.isValidElement(element) || element.type.displayName !== "Pushtell.Variant") {
        let error = new Error("Pushtell Experiment children must be Pushtell Variant components.");
        error.type = "PUSHTELL_INVALID_CHILD";
        throw error;
      }
      children[element.props.name] = element;
      emitter.addExperimentVariant(props.name, element.props.name);
    });
    emitter.emit("variants-loaded", props.name);
    this.state.variants = children;

    let value = typeof this.props.value === "function" ? this.props.value() : this.props.value;
    if (!this.state.variants[value]) {
      if ("production" !== process.env.NODE_ENV) {
        warning(true, 'Experiment “' + this.props.name + '” does not contain variant “' + value + '”');
      }
    }
    emitter._incrementActiveExperiments(this.props.name);
    emitter.setActiveVariant(this.props.name, value);
    emitter._emitPlay(this.props.name, value);
    this.state.value = value;
  }

  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.value !== state.value || nextProps.children !== state.rawChildren) {
      let value = typeof nextProps.value === "function" ? nextProps.value() : nextProps.value;
      let children = {};
      React.Children.forEach(nextProps.children, element => {
        children[element.props.name] = element;
      });
      return {
        value: value,
        variants: children,
        rawChildren: nextProps.children
      };
    }

    return null;
  }

  componentDidMount() {
    this.valueSubscription = emitter.addActiveVariantListener(this.props.name, (experimentName, variantName) => {
      this.setState({
        value: variantName
      });
    });
  }

  componentWillUnmount() {
    emitter._decrementActiveExperiments(this.props.name);
    this.valueSubscription.remove();
  }

  render() {
    return this.state.variants[this.state.value] || null;
  }
};

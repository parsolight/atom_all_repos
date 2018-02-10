import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import cx from 'classnames';

import Commands, {Command} from './commands';
import {BranchPropType} from '../prop-types';
import {GitError} from '../git-shell-out-strategy';

export default class BranchMenuView extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    repository: PropTypes.object,
    branches: PropTypes.arrayOf(BranchPropType).isRequired,
    currentBranch: BranchPropType.isRequired,
    checkout: PropTypes.func,
  }

  static defaultProps = {
    checkout: () => Promise.resolve(),
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      createNew: false,
      checkedOutBranch: null,
    };
  }

  render() {
    const branchNames = this.props.branches.map(branch => branch.getName());
    let currentBranchName = this.props.currentBranch.getName();
    if (this.state.checkedOutBranch) {
      currentBranchName = this.state.checkedOutBranch;
      if (branchNames.indexOf(this.state.checkedOutBranch) === -1) {
        branchNames.push(this.state.checkedOutBranch);
      }
    }

    const disableControls = !!this.state.checkedOutBranch;

    const branchEditorClasses = cx('github-BranchMenuView-item', 'github-BranchMenuView-editor', {
      hidden: !this.state.createNew,
    });

    const branchSelectListClasses = cx('github-BranchMenuView-item', 'github-BranchMenuView-select', 'input-select', {
      hidden: !!this.state.createNew,
    });

    const iconClasses = cx('github-BranchMenuView-item', 'icon', {
      'icon-git-branch': !disableControls,
      'icon-sync': disableControls,
    });

    const newBranchEditor = (
      <div className={branchEditorClasses}>
        <atom-text-editor
          ref={e => { this.editorElement = e; }}
          mini={true}
          readonly={disableControls ? true : undefined}
        />
      </div>
    );

    const selectBranchView = (
      <select
        className={branchSelectListClasses}
        onChange={this.didSelectItem}
        disabled={disableControls}
        value={currentBranchName}>
        {this.props.currentBranch.isDetached() &&
          <option key="detached" value="detached" disabled>{this.props.currentBranch.getName()}</option>
        }
        {branchNames.map(branchName => {
          return <option key={branchName} value={branchName}>{branchName}</option>;
        })}
      </select>
    );

    return (
      <div className="github-BranchMenuView">
        <Commands registry={this.props.commandRegistry} target=".github-BranchMenuView-editor atom-text-editor[mini]">
          <Command command="tool-panel:unfocus" callback={this.cancelCreateNewBranch} />
          <Command command="core:cancel" callback={this.cancelCreateNewBranch} />
          <Command command="core:confirm" callback={this.createBranch} />
        </Commands>
        <div className="github-BranchMenuView-selector">
          <span className={iconClasses} />
          {newBranchEditor}
          {selectBranchView}
          <button className="github-BranchMenuView-item github-BranchMenuView-button btn"
            onClick={this.createBranch} disabled={disableControls}> New Branch </button>
        </div>
      </div>
    );
  }

  componentWillReceiveProps(nextProps) {
    const currentBranch = nextProps.currentBranch.getName();
    const branchNames = nextProps.branches.map(branch => branch.getName());
    const hasNewBranch = branchNames.includes(this.state.checkedOutBranch);
    if (currentBranch === this.state.checkedOutBranch && hasNewBranch) {
      this.editorElement.classList.add('is-focused');
      this.setState({checkedOutBranch: null});
      if (this.state.createNew) { this.setState({createNew: false}); }
    }
  }

  @autobind
  async didSelectItem(event) {
    const branchName = event.target.value;
    await this.checkout(branchName);
  }

  @autobind
  async createBranch() {
    if (this.state.createNew) {
      const branchName = this.editorElement.innerText.trim();
      await this.checkout(branchName, {createNew: true});
    } else {
      this.setState({createNew: true}, () => {
        this.editorElement.focus();
      });
    }
  }

  @autobind
  async checkout(branchName, options) {
    this.editorElement.classList.remove('is-focused');
    this.setState({checkedOutBranch: branchName});
    try {
      await this.props.checkout(branchName, options);
    } catch (error) {
      this.editorElement.classList.add('is-focused');
      this.setState({checkedOutBranch: null});
      if (error instanceof GitError) {
        // eslint-disable-next-line no-console
        console.warn('Non-fatal', error);
      } else {
        throw error;
      }
    }
  }

  @autobind
  cancelCreateNewBranch() {
    this.setState({createNew: false});
  }
}

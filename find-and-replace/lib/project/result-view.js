const getIconServices = require('../get-icon-services');
const MatchView = require('./match-view');
const path = require('path');
const etch = require('etch');
const $ = etch.dom;

module.exports =
class ResultView {
  constructor({item, top, bottom} = {}) {
    const {
      filePath, matches, isSelected, selectedMatchIndex, isExpanded, regex,
      replacePattern, previewStyle, pathDetailsHeight, matchHeight, contextLineHeight,
      leadingContextLineCount, trailingContextLineCount
    } = item;

    this.top = top;
    this.bottom = bottom;
    this.pathDetailsHeight = pathDetailsHeight;
    this.matchHeight = matchHeight;
    this.contextLineHeight = contextLineHeight;
    this.leadingContextLineCount = leadingContextLineCount;
    this.trailingContextLineCount = trailingContextLineCount;

    this.filePath = filePath
    this.matches = matches
    this.isExpanded = isExpanded;
    this.isSelected = isSelected;
    this.selectedMatchIndex = selectedMatchIndex;
    this.regex = regex;
    this.replacePattern = replacePattern;
    this.previewStyle = previewStyle;
    etch.initialize(this);
    getIconServices().updateIcon(this);
  }

  destroy() {
    return etch.destroy(this)
  }

  update({item, top, bottom} = {}) {
    const {
      filePath, matches, isSelected, selectedMatchIndex, isExpanded, regex,
      replacePattern, previewStyle, pathDetailsHeight, matchHeight, contextLineHeight,
      leadingContextLineCount, trailingContextLineCount
    } = item;

    const changed =
      matches !== this.matches ||
      isExpanded !== this.isExpanded ||
      isSelected !== this.isSelected ||
      selectedMatchIndex !== this.selectedMatchIndex ||
      regex !== this.regex ||
      replacePattern !== this.replacePattern ||
      previewStyle !== this.previewStyle ||
      top !== this.top ||
      bottom !== this.bottom ||
      pathDetailsHeight !== this.pathDetailsHeight ||
      contextLineHeight !== this.contextLineHeight ||
      leadingContextLineCount !== this.leadingContextLineCount ||
      trailingContextLineCount !== this.trailingContextLineCount ||
      matchHeight !== this.matchHeight;

    if (changed) {
      this.filePath = filePath;
      this.matches = matches;
      this.isExpanded = isExpanded;
      this.isSelected = isSelected;
      this.selectedMatchIndex = selectedMatchIndex;
      this.regex = regex;
      this.replacePattern = replacePattern;
      this.previewStyle = previewStyle;
      this.top = top;
      this.bottom = bottom;
      this.pathDetailsHeight = pathDetailsHeight;
      this.matchHeight = matchHeight;
      this.contextLineHeight = contextLineHeight;
      this.leadingContextLineCount = leadingContextLineCount;
      this.trailingContextLineCount = trailingContextLineCount;
      etch.update(this)
    }
  }

  writeAfterUpdate() {
    getIconServices().updateIcon(this);
  }

  render() {
    let relativePath = this.filePath;
    if (atom.project) {
      let rootPath;
      [rootPath, relativePath] = atom.project.relativizePath(this.filePath);
      if (rootPath && atom.project.getDirectories().length > 1) {
        relativePath = path.join(path.basename(rootPath), relativePath);
      }
    }

    const isPathSelected = this.isSelected && (
      !this.isExpanded ||
      this.selectedMatchIndex === -1
    );

    return (
      $.li(
        {
          key: this.filePath,
          dataset: {path: this.filePath},
          className: [
            'path',
            'list-nested-item',
            isPathSelected ? 'selected' : '',
            this.isExpanded ? '' : 'collapsed'
          ].join(' ').trim()
        },

        $.div({ref: 'pathDetails', className: 'path-details list-item'},
          $.span({className: 'disclosure-arrow'}),
          $.span({
            ref: 'icon',
            className: 'icon',
            dataset: {name: path.basename(this.filePath)}
          }),
          $.span({className: 'path-name bright'},
            relativePath
          ),
          $.span({ref: 'description', className: 'path-match-number'},
            `(${this.matches.length} match${this.matches.length === 1 ? '' : 'es'})`
          )
        ),

        this.renderList()
      )
    );
  }

  renderList() {
    const children = [];
    const top = Math.max(0, this.top - this.pathDetailsHeight);
    const bottom = this.bottom - this.pathDetailsHeight;

    let i = 0;
    let itemTopPosition = 0;

    for (; i < this.matches.length; i++) {
      const match = this.matches[i];
      let itemBottomPosition = itemTopPosition + this.matchHeight;
      if (match.leadingContextLines && this.leadingContextLineCount) itemBottomPosition += this.leadingContextLineCount * this.contextLineHeight;
      if (match.trailingContextLines && this.trailingContextLineCount) itemBottomPosition += this.trailingContextLineCount * this.contextLineHeight;

      if (itemBottomPosition > top) break;
      itemTopPosition = itemBottomPosition;
    }

    for (; i < this.matches.length; i++) {
      const match = this.matches[i];
      let itemBottomPosition = itemTopPosition + this.matchHeight;
      if (match.leadingContextLines && this.leadingContextLineCount) itemBottomPosition += this.leadingContextLineCount * this.contextLineHeight;
      if (match.trailingContextLines && this.trailingContextLineCount) itemBottomPosition += this.trailingContextLineCount * this.contextLineHeight;

      children.push(
        etch.dom(MatchView, {
          match,
          key: i,
          regex: this.regex,
          replacePattern: this.replacePattern,
          isSelected: (i === this.selectedMatchIndex),
          previewStyle: this.previewStyle,
          top: itemTopPosition,
          leadingContextLineCount: this.leadingContextLineCount,
          trailingContextLineCount: this.trailingContextLineCount
        })
      );

      if (itemBottomPosition >= bottom) break;
      itemTopPosition = itemBottomPosition;
    }

    return $.ol(
      {
        ref: 'list',
        className: 'matches list-tree',
        style: {height: `${itemTopPosition}px`, position: 'relative'}
      },
      ...children
    )
  }
};

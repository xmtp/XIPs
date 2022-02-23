# XIP-0 XIP Purpose, Process, & Guidelines

- **xip:** 0
- **title:** XIP Purpose, Process, & Guidelines
- **discussions-to**: <https://community.xmtp.org/t/xip-0-xip-purpose-process-guidelines/475>
- **status:** Draft
- **type:** Process
- **author:** Matt Galligan `(@mg0716)`, et al
- **created:** 2022-02-22

## What is an XIP?

XIP stands for XMTP Improvement Proposal. An XIP is a design document providing information to the XMTP community, or describing a new feature for XTMP or its processes or environment. The XIP should provide a concise technical specification of the feature and a rationale for the feature. The XIP author is responsible for building consensus within the community and documenting dissenting opinions.

## XIP Rationale

We intend XIPs to be the primary mechanisms for proposing new features, for collecting community technical input on an issue, and for documenting the design decisions that have gone into XMTP. Because the XIPs are maintained as text files in a versioned repository, their revision history is the historical record of the feature proposal.

For XMTP implementers, XIPs are a convenient way to track the progress of their implementation. Ideally each implementation maintainer would list the XIPs that they have implemented. This will give end users a convenient way to know the current status of a given implementation or library.

## XIP Types

There are three major categories of XIPs, as well as more specific subcategories:

- A **Standards Track XIP** describes any changes affecting most or all XMTP implementations, or the interoperability of applications using XMTP.
  - **Core**: includes backwards-incompatible changes that require a consensus fork
  - **Network**: includes specifications and proposals around networking behavior
  - **Interface**: includes improvements around client API/RPC specifications and standards
  - **XRC**: short for *XMTP Request for Comment* and includes application-level standards and conventions, such as message format standards
- A **Process XIP** describes a process surrounding XMTP, or proposes changes to an existing process. They may propose an implementation, but not to XMTP's codebase; they often require community consensus; unlike Informational XIPs, they are more than recommendations, and users are typically not free to ignore them.
- An **Informational XIP** provides general guidelines or information to the XMTP community, but does not propose a new feature. Informational XIPs do not necessarily represent a XMTP community consensus or recommendation, so users and implementors are free to ignore Informational XMTP or follow their advice.

It is highly recommended that a single XIP contain a single key proposal or new idea. The more focused the XIP, the more successful it tends to be. If in doubt, split your XIP into several well-focused ones. A change to one client doesn’t require an XIP; a change that affects multiple clients, or defines a standard for multiple apps to use, does.

An XIP must meet certain minimum criteria. It must be a clear and complete description of the proposed enhancement. The enhancement must represent a net improvement. The proposed implementation, if applicable, must be solid and must not complicate the protocol unduly.

## XIP Workflow

### Shepherding an XIP

Parties involved in the process are you, the champion or *XIP author*, the [*XIP editors*](#XIP-editors), and the *XMTP Core Developers* (currently the XMTP Labs team).

Before you begin writing a formal XIP, you should vet your idea. Ask the XMTP community first if an idea is original to avoid wasting time on something that will be rejected based on prior research. It is thus recommended to open a discussion thread on [the XMTP Community forum](https://community.xmtp.org/c/xips/51) to do this.

Once the idea has been vetted, your next responsibility will be to present (by means of an XIP) the idea to the reviewers and all interested parties, invite editors, developers, and the community to give feedback on the aforementioned channels. You should try and gauge whether the interest in your XIP is commensurate with both the work involved in implementing it and how many parties will have to conform to it. Negative community feedback will be taken into consideration and may prevent your XIP from moving past the Draft stage.

### XIP Process

- **Idea** - An idea that is pre-draft. This is not tracked within the XIP Repository.
- **Draft** - The first formally tracked stage of an XIP in development. An XIP is merged by an XIP Editor into the XIP repository when properly formatted.
- **Review** - An XIP Author marks an XIP as ready for and requesting Peer Review.
- **Last Call** - This is the final review window for an XIP before moving to `Final`. An XIP editor will assign `Last Call` status and set a review end date (`last-call-deadline`), typically 14 days later. If this period results in necessary normative changes it will revert the XIP to `Review`.
- **Final** - This XIP represents the final standard. A Final XIP exists in a state of finality and should only be updated to correct errata and add non-normative clarifications.
- **Stagnant** - Any XIP in `Draft` or `Review` or `Last Call` if inactive for a period of 6 months or greater is moved to `Stagnant`. An XIP may be resurrected from this state by Authors or XIP Editors through moving it back to `Draft` or it’s earlier status. If not resurrected, a proposal may stay forever in this status.
- **Withdrawn** - The XIP Author(s) have withdrawn the proposed XIP. This state has finality and can no longer be resurrected using this XIP number. If the idea is pursued at later date it is considered a new proposal.
- **Living** - A special status for XIPs that are designed to be continually updated and not reach a state of finality. This includes most notably XIP-0.

## What belongs in a successful XIP?

Each XIP should have the following parts:

- Preamble - RFC 822 style headers containing metadata about the XIP, including the XIP number, a short descriptive title (limited to a maximum of 44 characters), a description (limited to a maximum of 140 characters), and the author details. Irrespective of the category, the title and description should not include XIP number. See [below](xip-0-purpose-process.md#xip-header-preamble) for details.
- Abstract - Abstract is a multi-sentence (short paragraph) technical summary. This should be a very terse and human-readable version of the specification section. Someone should be able to read only the abstract to get the gist of what this specification does.
- Motivation (*optional) - A motivation section is critical for XIPs that want to change the XTMP protocol. It should clearly explain why the existing protocol specification is inadequate to address the problem that the XIP solves. XIP submissions without sufficient motivation may be rejected outright.
- Specification - The technical specification should describe the syntax and semantics of any new feature. The specification should be detailed enough to allow competing, interoperable implementations for any of the current XMTP platforms.
- Rationale - The rationale fleshes out the specification by describing what motivated the design and why particular design decisions were made. It should describe alternate designs that were considered and related work, e.g. how the feature is supported in other languages. The rationale may also provide evidence of consensus within the community, and should discuss important objections or concerns raised during discussion.
- Backwards Compatibility - All XIPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. The XIP must explain how the author proposes to deal with these incompatibilities. XIP submissions without a sufficient backwards compatibility treatise may be rejected outright.
- Test Cases - Test cases for an implementation are mandatory for XIPs that are affecting consensus changes. Tests should either be inlined in the XIP as data (such as input/expected output pairs, or included in `../assets/XIP-###/<filename>`.
- Reference Implementation - An optional section that contains a reference/example implementation that people can use to assist in understanding or implementing this specification.
- Security Considerations - All XIPs must contain a section that discusses the security implications/considerations relevant to the proposed change. Include information that might be important for security discussions, surfaces risks and can be used throughout the life-cycle of the proposal. E.g. include security-relevant design decisions, concerns, important discussions, implementation-specific guidance and pitfalls, an outline of threats and risks and how they are being addressed. XIP submissions missing the "Security Considerations" section will be rejected. An XIP cannot proceed to status "Final" without a Security Considerations discussion deemed sufficient by the reviewers.
- Copyright Waiver - All XIPs must be in the public domain. See the bottom of this XIP for an example copyright waiver.

## XIP Formats and Templates

XIPs should be written in [markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) format. There is a [template](../xip-template.md) to follow.

## XIP Header Preamble

Each XIP must begin with an [RFC 822](https://www.ietf.org/rfc/rfc822.txt) style header preamble, formatted as a bulleted list. The headers must appear in the following order.

`XIP`: *XIP number* (this is determined by the XIP editor)

`title`: *The XIP title is a few words, not a complete sentence*

`description`: *Description is one full (short) sentence*

`author`: *The list of the author's or authors' name(s) and/or username(s), or name(s) and email(s). Details are below.*

`discussions-to`: *The url pointing to the official discussion thread*

`status`: *Draft, Review, Last Call, Final, Stagnant, Withdrawn, Living*

`last-call-deadline`: *The date last call period ends on* (Optional field, only needed when status is `Last Call`)

`type`: *One of `Standards Track`, `Process`, or `Informational`*

`category`: *One of `Core`, `Network`, `Interface`, or `XRC`* (Optional field, only needed for `Standards Track` XIPs)

`created`: *Date the XIP was created on*

`requires`: *XIP number(s)* (Optional field)

`withdrawal-reason`: *A sentence explaining why the XIP was withdrawn.* (Optional field, only needed when status is `Withdrawn`)

Headers that permit lists must separate elements with commas.

Headers requiring dates will always do so in the format of ISO 8601 (yyyy-mm-dd).

### `author` header

The `author` header lists the names, email addresses or GitHub usernames of the authors/owners of the XIP. Those who prefer anonymity may use a GitHub username only, or a first name and a GitHub username. The format of the `author` header value must be:

> Random J. User `<address@dom.ain>`

or

> Random J. User `(@username)`

if the email address or GitHub username is included.

It is not possible to use both an email and a GitHub username at the same time. If important to include both, one could include their name twice, once with the GitHub username, and once with the email.

At least one author must use a GitHub username, in order to get notified on change requests and have the capability to approve or reject them.

### `discussions-to` header

While an XIP is a draft, a `discussions-to` header will indicate the URL where the XIP is being discussed.

The preferred discussion URL is a topic on [XMTP Community forums](https://community.xmtp.org/c/xips/51). The URL cannot point to Github pull requests, any URL which is ephemeral, and any URL which can get locked over time (i.e. Reddit topics).

### `type` header

The `type` header specifies the type of XIP: Standards Track, Process, or Informational. If the track is Standards please include the subcategory (network, interface, or XRC).

### `category` header

The `category` header specifies the XIP's category. This is required for standards-track XIPs only.

### `created` header

The `created` header records the date that the XIP was assigned a number. Both headers should be in yyyy-mm-dd format, e.g. 2001-08-14.

### `requires` header

XIPs may have a `requires` header, indicating the XIP numbers that this XIP depends on.

## Linking to other XIPs

References to other XIPs should follow the format `XIP-N` where `N` is the XIP number you are referring to. Each XIP that is referenced in an XIP **MUST** be accompanied by a relative markdown link the first time it is referenced, and MAY be accompanied by a link on subsequent references. The link MUST always be done via relative paths so that the links work in this GitHub repository, forks of this repository, the main XIPs site, mirrors of the main XIP site, etc. For example, you would link to this XIP with `[XIP-0](./XIPs/xip-0-purpose-process.md))`.

## Auxiliary Files

Images, diagrams and auxiliary files should be included in a subdirectory of the assets folder for that XIP as follows: `assets/xip-N` (where `N` is to be replaced with the XIP number). When linking to an image in the XIP, use relative links such as `../assets/xip-0/image.png`.

## Transferring XIP Ownership

It occasionally becomes necessary to transfer ownership of XIPs to a new champion. In general, we’d like to retain the original author as a co-author of the transferred XIP, but that’s really up to the original author. A good reason to transfer ownership is because the original author no longer has the time or interest in updating it or following through with the XIP process, or has fallen off the face of the ‘net (i.e. is unreachable or isn’t responding to email). A bad reason to transfer ownership is because you don’t agree with the direction of the XIP. We try to build consensus around an XIP, but if that’s not possible, you can always submit a competing XIP.

If you are interested in assuming ownership of an XIP, send a message asking to take over, addressed to both the original author and the XIP editor. If the original author doesn’t respond to the email in a timely manner, the XIP editor will make a unilateral decision (it’s not like such decisions can’t be reversed :)).

## XIP Editors

The current XIP editors are

- Matt Galligan (@mg0716)
- Saul Carlin (@saulmc)
- Steven Normore (@snormore)

## XIP Editor Responsibilities

For each new XIP proposal that is submitted as a pull request, an editor does the following:

- Read the XIP to check if it is ready: sound and complete. The ideas must make technical sense, even if they don't seem likely to get to final status.
- The title should accurately describe the content.
- Check the XIP for language (spelling, grammar, sentence structure, etc.), markup (GitHub flavored Markdown), code style

If the XIP isn't ready, the editor will send it back to the author for revision, with specific instructions.

Once the XIP is ready for the repository, the XIP editor will:

- Assign an XIP number (generally the PR number, but the decision is with the editors)
- Merge the corresponding [pull request](https://github.com/xmtp/XIPs/pulls)
- Send a message back to the XIP author with the next step.

Many XIPs are written and maintained by developers with write access to the XMTP codebase. The XIP editors monitor XIP changes, and correct any structure, grammar, spelling, or markup mistakes we see.

The editors don't pass judgment on XIPs. We merely do the administrative & editorial part.

## Style Guide

### XIP Pull Request Titles

When assigning a title to a pull request that contains a proposal, it should include the title of said proposal.

### XIP numbers

When referring to an XIP by number, it should be written in the hyphenated form `XIP-N` where `N` is the XIP's assigned number.

### RFC 2119

XIPs are encouraged to follow [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) for terminology and to insert the following at the beginning of the Specification section:

> The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

## History

This document was derived heavily from [Ethereum's EIP-1](https://eips.ethereum.org/EIPS/eip-1), which was derived from [Bitcoin's BIP-0001](https://github.com/bitcoin/bips) written by Amir Taaki, which in turn was derived from [Python's PEP-0001](https://www.python.org/dev/peps/). In many places text was simply copied and modified. Although the PEP-0001 text was written by Barry Warsaw, Jeremy Hylton, and David Goodger, they are not responsible for its use in the XMTP Improvement Process, and should not be bothered with technical questions specific to XMTP or the XIP. Please direct all comments to the XIP editors.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

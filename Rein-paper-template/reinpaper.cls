% Rein Protocol Foundation publication class. Original design; not a conference style file.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{reinpaper}[2026/10/28 v1.0 Rein Protocol Foundation research papers]

\newif\ifreintwocolumn
\newif\ifreinanonymous
\newif\ifreinmonochrome
\DeclareOption{singlecolumn}{\reintwocolumnfalse}
\DeclareOption{twocolumn}{\reintwocolumntrue}
\DeclareOption{anonymous}{\reinanonymoustrue}
\DeclareOption{monochrome}{\reinmonochrometrue}
\DeclareOption*{\ClassWarning{reinpaper}{Unknown option `\CurrentOption'}}
\ExecuteOptions{singlecolumn}
\ProcessOptions\relax
\ifreintwocolumn
  \LoadClass[10pt,letterpaper,twocolumn]{article}
\else
  \LoadClass[11pt,letterpaper]{article}
\fi

\RequirePackage{iftex}
\ifPDFTeX
  \pdfminorversion=7
  \RequirePackage[T1]{fontenc}
  \RequirePackage[utf8]{inputenc}
  \ifreintwocolumn
    \RequirePackage{newtxtext}
  \else
    \RequirePackage{mathpazo}
  \fi
  \RequirePackage[scaled=0.92]{helvet}
  \RequirePackage[noupquote]{zi4}
\else
  \AtBeginDvi{\special{pdf:minorversion 7}}
  \RequirePackage[no-math]{fontspec}
  \ifreintwocolumn
    \setmainfont{TeXGyreTermesX}
  \else
    \IfFontExistsTF{TeX Gyre Pagella}{\setmainfont{TeX Gyre Pagella}}
      {\setmainfont{Palatino}}
  \fi
  \IfFontExistsTF{TeX Gyre Heros}{\setsansfont{TeX Gyre Heros}[Scale=0.92]}
    {\setsansfont{Helvetica}[Scale=0.92]}
  \setmonofont{Inconsolatazi4}[Extension=.otf,
    UprightFont=*-Regular,BoldFont=*-Bold,
    ItalicFont=*-Regular,ItalicFeatures={FakeSlant=0.2},
    BoldItalicFont=*-Bold,BoldItalicFeatures={FakeSlant=0.2}]
\fi
\RequirePackage{microtype}
\RequirePackage{geometry}
\ifreintwocolumn
  \geometry{left=0.7in,right=0.7in,top=0.68in,bottom=0.78in,
    headheight=20pt,headsep=16pt,footskip=27pt}
  \setlength{\columnsep}{0.28in}
\else
  \geometry{left=1.1in,right=1.1in,top=0.78in,bottom=0.85in,
    headheight=20pt,headsep=18pt,footskip=29pt}
\fi

\RequirePackage{xcolor}
\definecolor{REINPrimary}{HTML}{24211E}
\definecolor{REINAccent}{HTML}{D8572A}
\definecolor{REINInk}{HTML}{24211E}
\definecolor{REINMuted}{HTML}{5C6577}
\definecolor{REINLight}{HTML}{F7F4EF}
\definecolor{REINLine}{HTML}{DDD7CE}
\definecolor{REINORCID}{HTML}{A6CE39}
\ifreinmonochrome
  \colorlet{REINORCID}{black!55}
  \colorlet{REINPrimary}{black}
  \colorlet{REINAccent}{black!60}
  \colorlet{REINInk}{black}
  \colorlet{REINMuted}{black!65}
  \colorlet{REINLight}{black!4}
  \colorlet{REINLine}{black!25}
\fi
% Backward-compatible aliases for existing figures and papers.
\colorlet{REINForest}{REINPrimary}
\colorlet{REINGold}{REINAccent}
\RequirePackage{graphicx}
\RequirePackage{amsmath,amssymb,amsthm}
\ifreintwocolumn
  \ifPDFTeX\RequirePackage{newtxmath}\else\RequirePackage[noOT1]{newtxmath}\fi
\fi
\RequirePackage{booktabs,array,tabularx,multirow}
\RequirePackage{enumitem}
\RequirePackage{caption}
\RequirePackage{algorithm}
\RequirePackage{algpseudocode}
\RequirePackage{listings}
\RequirePackage{tikz}
\usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds}
\RequirePackage{titlesec}
\RequirePackage{fancyhdr}
\RequirePackage{etoolbox}
\RequirePackage{url}
\ifreintwocolumn
  \RequirePackage[numbers,sort&compress]{natbib}
\else
  \RequirePackage[authoryear,round]{natbib}
\fi
\RequirePackage{hyperref}
\hypersetup{colorlinks=true,allcolors=REINForest,bookmarksnumbered=true,
  pdfdisplaydoctitle=true,pdfborder={0 0 0}}
\urlstyle{tt}
\pdfstringdefDisableCommands{\def\\{ }\def\texttt#1{#1}\def\thanks#1{}%
  \def\textsuperscript#1{}\def\quad{ }\def\qquad{ }\def\and{, }%
  \def\reinorcid#1{}}

% All identifying metadata is controlled here so anonymous mode is consistent.
\newcommand{\reinlabname}{Rein Protocol Foundation}
\newcommand{\rein@affiliation}{Rein Protocol Foundation}
\newcommand{\rein@emails}{}
\newcommand{\rein@shorttitle}{Research paper}
\newcommand{\rein@track}{AI / SOFTWARE / SECURITY / SYSTEMS}
\newcommand{\rein@status}{RESEARCH PREPRINT}
\newcommand{\rein@paperid}{}
\newcommand{\rein@keywords}{}
\newcommand{\rein@version}{}
\newcommand{\reinaffiliation}[1]{\gdef\rein@affiliation{#1}}
\newcommand{\reinemails}[1]{\gdef\rein@emails{#1}}
\newcommand{\reinshorttitle}[1]{\gdef\rein@shorttitle{#1}}
\newcommand{\reintrack}[1]{\gdef\rein@track{#1}}
\newcommand{\reinstatus}[1]{\gdef\rein@status{#1}}
\newcommand{\reinpaperid}[1]{\gdef\rein@paperid{#1}}
\newcommand{\reinkeywords}[1]{\gdef\rein@keywords{#1}}
\newcommand{\reinversion}[1]{\gdef\rein@version{#1}}
% Optional paper resources, printed after the abstract. Empty URLs display
% placeholders; omitting a setter omits its row. Anonymous mode hides all rows.
\newif\ifreinproject
\newif\ifreingithub
\newif\ifreindataset
\newcommand{\rein@projecturl}{}
\newcommand{\rein@projectlabel}{}
\newcommand{\rein@githuburl}{}
\newcommand{\rein@githublabel}{}
\newcommand{\rein@dataseturl}{}
\newcommand{\rein@datasetlabel}{}
\newcommand{\reinproject}[2][]{\reinprojecttrue
  \gdef\rein@projectlabel{#1}\gdef\rein@projecturl{#2}}
\newcommand{\reingithub}[2][]{\reingithubtrue
  \gdef\rein@githublabel{#1}\gdef\rein@githuburl{#2}}
\newcommand{\reindataset}[2][]{\reindatasettrue
  \gdef\rein@datasetlabel{#1}\gdef\rein@dataseturl{#2}}
\newcommand{\reinhideresources}{\reinprojectfalse\reingithubfalse\reindatasetfalse}
% Small native vector icons avoid an external icon font dependency.
\newcommand{\rein@resourceicon}[1]{%
  \tikz[x=1pt,y=1pt,baseline=2pt,draw=REINPrimary,line width=.45pt,
    line cap=round,line join=round]{%
    \useasboundingbox (0,0) rectangle (9,9);
    \ifcase#1
      \draw (4.5,4.5) circle (4);
      \draw (4.5,4.5) ellipse (1.7 and 4);
      \draw (.5,4.5)--(8.5,4.5);
    \or
      \draw (3,1.5)--(.5,4.5)--(3,7.5);
      \draw (6,1.5)--(8.5,4.5)--(6,7.5);
      \draw (4,1)--(5,8);
    \or
      \draw (4.5,7) ellipse (3.7 and 1.4);
      \draw (.8,7)--(.8,1.7) arc (180:360:3.7 and 1.4)--(8.2,7);
      \draw (.8,4.4) arc (180:360:3.7 and 1.4);
    \fi}}
\newcommand{\rein@resourcelink}[3]{%
  \ifdefempty{#1}{{\color{REINMuted}\itshape #3}}{%
    \ifdefempty{#2}{\href{#1}{\expandafter\nolinkurl\expandafter{#1}}}%
      {\href{#1}{#2}}}}
\newcommand{\rein@resourcerow}[5]{%
  \noindent\rein@resourceicon{#1}\hspace{4pt}\textbf{#2:}\hspace{4pt}%
  \rein@resourcelink{#3}{#4}{#5}\par}
\newcommand{\reinresources}{\ifreinanonymous\else
  \ifboolexpr{bool {reinproject} or bool {reingithub} or bool {reindataset}}{%
    \par\vspace{6pt}\noindent\begin{minipage}{\linewidth}\centering
    \sffamily\fontsize{10}{13.5}\selectfont\color{REINPrimary}
      \ifreinproject
        \rein@resourcerow{0}{Project page}{\rein@projecturl}{\rein@projectlabel}{[project-page-url]}%
      \fi
      \ifreingithub
        \rein@resourcerow{1}{GitHub}{\rein@githuburl}{\rein@githublabel}{[github-repository-url]}%
      \fi
      \ifreindataset
        \rein@resourcerow{2}{Dataset}{\rein@dataseturl}{\rein@datasetlabel}{[dataset-url]}%
      \fi
    \end{minipage}\par
  }{}\fi}
% ORCID iD badge placed after an author's name. An empty ID prints an unlinked
% placeholder badge; omitting the command omits the badge.
\newcommand{\rein@orcidbadge}{%
  \tikz[x=1pt,y=1pt,baseline=0pt]{%
    \fill[REINORCID] (3.8,3.8) circle (3.8);
    \node[text=white,inner sep=0pt,font=\sffamily\bfseries\fontsize{4.6}{4.6}\selectfont]
      at (3.8,3.75) {iD};}}
\newcommand{\reinorcid}[1]{\hspace{1.5pt}%
  \ifblank{#1}{\rein@orcidbadge}{\href{https://orcid.org/#1}{\rein@orcidbadge}}}
% Optional masthead slot: a placeholder until a collaborator's artwork is supplied.
\newif\ifreinpartner
\reinpartnerfalse
\newcommand{\rein@partnername}{Partner Institution}
\newcommand{\rein@partnerlogo}{}
\newcommand{\rein@partnermono}{}
\newcommand{\reinpartner}[3][]{\reinpartnertrue
  \gdef\rein@partnermono{#1}\gdef\rein@partnername{#2}\gdef\rein@partnerlogo{#3}}
\newcommand{\reinhidepartner}{\reinpartnerfalse}
\newcommand{\reinacknowledgments}[1]{\ifreinanonymous\else
  \section*{Acknowledgments}#1\fi}
\newcommand{\reinlogo}[1][32pt]{%
  \ifreinanonymous\else
    \ifreinmonochrome
      \includegraphics[height=#1]{assets/rein-mark.png}%
    \else
      \includegraphics[height=#1]{assets/rein-mark.png}%
    \fi
  \fi}
\newcommand{\reinwordmark}{%
  \ifreinanonymous\else
    \raisebox{-.5\height}{\reinlogo[28pt]}\hspace{9pt}%
    \raisebox{-.5\height}{\sffamily\bfseries\color{REINInk}\shortstack[l]{%
      \fontsize{17}{20}\selectfont REIN PROTOCOL\\[3pt]
      \fontsize{10}{12}\selectfont FOUNDATION}}%
  \fi}
\newcommand{\rein@externalgraphic}[3]{%
  \ifreinmonochrome
    \ifdefempty{#2}{\includegraphics[height=#3,width=\linewidth,keepaspectratio]{#1}}%
      {\includegraphics[height=#3,width=\linewidth,keepaspectratio]{#2}}%
  \else\includegraphics[height=#3,width=\linewidth,keepaspectratio]{#1}\fi}
\newcommand{\reinpartnermark}{\ifreinanonymous\else\ifreinpartner
  \ifdefempty{\rein@partnerlogo}{%
    \begin{tikzpicture}
      \node[draw=REINLine,dashed,rounded corners=2pt,inner sep=4pt,
        text width=\dimexpr\linewidth-10pt\relax,minimum height=30pt,align=center]
        {{\sffamily\fontsize{7}{9}\selectfont\color{REINMuted}\rein@partnername}\\[-1pt]
         {\sffamily\fontsize{5.5}{7}\selectfont\color{REINMuted}LOGO PLACEHOLDER}};
    \end{tikzpicture}%
  }{\rein@externalgraphic{\rein@partnerlogo}{\rein@partnermono}{30pt}}%
  \fi\fi}
\newcommand{\rein@brandrow}{%
  \noindent\begin{minipage}[c]{.74\textwidth}\reinwordmark\end{minipage}%
  \ifreinpartner\hfill
    \begin{minipage}[c]{.22\textwidth}\centering\reinpartnermark\end{minipage}%
  \fi\par}

\setlength{\parindent}{1em}
\setlength{\parskip}{0pt}
\setlength{\emergencystretch}{1em}
\linespread{1.035}
\raggedbottom
\clubpenalty=10000
\widowpenalty=10000
\displaywidowpenalty=10000
\setlist{nosep,leftmargin=1.4em,topsep=4pt}
\setlist[itemize]{label=\textcolor{REINForest}{\small\textbullet}}
\setlength{\textfloatsep}{12pt plus 3pt minus 2pt}
\setlength{\floatsep}{10pt plus 2pt minus 2pt}
\setlength{\intextsep}{10pt plus 2pt minus 2pt}
\renewcommand{\topfraction}{0.92}
\renewcommand{\bottomfraction}{0.85}
\renewcommand{\textfraction}{0.08}
\renewcommand{\floatpagefraction}{0.75}
\setcounter{topnumber}{3}
\setcounter{bottomnumber}{2}
\setcounter{totalnumber}{5}
\captionsetup{font=small,labelfont={bf,sf,color=REINForest},
  labelsep=period,skip=6pt}
\captionsetup[table]{position=top}
\titleformat{\section}{\sffamily\bfseries\large\color{REINForest}}
  {\thesection}{0.65em}{}
\titleformat{\subsection}{\sffamily\bfseries\normalsize\color{REINInk}}
  {\thesubsection}{0.6em}{}
\titleformat{\subsubsection}{\sffamily\bfseries\normalsize}
  {\thesubsubsection}{0.6em}{}
\titleformat{\paragraph}[runin]{\bfseries}{\theparagraph}{0.5em}{}[.]
\titlespacing*{\section}{0pt}{2.2ex plus 0.5ex minus 0.3ex}{0.8ex}
\titlespacing*{\subsection}{0pt}{1.7ex plus 0.3ex}{0.6ex}
\titlespacing*{\subsubsection}{0pt}{1.4ex plus 0.2ex}{0.5ex}
\titlespacing*{\paragraph}{0pt}{1ex}{0.7em}

\newtheorem{theorem}{Theorem}[section]
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{proposition}[theorem]{Proposition}
\theoremstyle{definition}
\newtheorem{definition}{Definition}[section]
\newtheorem{assumption}{Assumption}[section]
\theoremstyle{remark}
\newtheorem{remark}{Remark}[section]
\def\sectionautorefname{Section}
\def\subsectionautorefname{Section}
\def\subsubsectionautorefname{Section}
\def\equationautorefname{Equation}
\def\figureautorefname{Figure}
\def\tableautorefname{Table}
\def\algorithmautorefname{Algorithm}
\def\assumptionautorefname{Assumption}
\def\lstlistingautorefname{Listing}
\floatname{algorithm}{Algorithm}
\algrenewcommand\algorithmiccomment[1]{\hfill{\color{REINMuted}\(\triangleright\) #1}}
\lstdefinestyle{rein}{basicstyle=\ttfamily\footnotesize,
  keywordstyle=\bfseries\color{REINForest},
  commentstyle=\itshape\color{REINMuted},
  stringstyle=\color{REINForest},
  backgroundcolor=\color{REINLight},
  frame=single,rulecolor=\color{REINLine},framerule=0.4pt,
  framesep=5pt,xleftmargin=6pt,xrightmargin=6pt,
  breaklines=true,columns=fullflexible,keepspaces=true,
  showstringspaces=false,tabsize=2,captionpos=b}
\lstset{style=rein}
% A self-contained Python lexer keeps the sample independent of lstlang*.sty.
\lstdefinelanguage{REINPython}{
  morekeywords={and,as,assert,async,await,break,class,continue,def,del,elif,
    else,except,False,finally,for,from,global,if,import,in,is,lambda,None,
    nonlocal,not,or,pass,raise,return,True,try,while,with,yield},
  sensitive=true,morecomment=[l]{\#},morestring=[b]",morestring=[b]'}
\newcommand{\reincallout}[2]{%
  \par\addvspace{8pt}\begingroup
  \setlength{\fboxsep}{8pt}\noindent
  \colorbox{REINLight}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{%
    {\sffamily\bfseries\small\color{REINForest}#1\par}\smallskip
    \small #2}}\par\endgroup\addvspace{8pt}}

% Short, quiet running furniture. Page one has only the footer.
\newcommand{\rein@footerleft}{%
  \ifreinanonymous
    ANONYMOUS MANUSCRIPT\ifdefempty{\rein@paperid}{}{\ / \rein@paperid}
  \else
    REIN PROTOCOL FOUNDATION\ / \rein@status
  \fi}
\newcommand{\rein@headerleft}{%
  \ifreinanonymous RESEARCH MANUSCRIPT\else REIN PROTOCOL FOUNDATION\fi}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\sffamily\fontsize{7.3}{9}\selectfont\color{REINMuted}\rein@headerleft}
\fancyhead[R]{\sffamily\fontsize{7.3}{9}\selectfont\color{REINMuted}\rein@shorttitle}
\fancyfoot[L]{\sffamily\fontsize{7}{9}\selectfont\color{REINMuted}\rein@footerleft}
\fancyfoot[R]{\sffamily\small\color{REINForest}\thepage}
\renewcommand{\headrulewidth}{0.3pt}
\renewcommand{\headrule}{\hbox to\headwidth{\color{REINLine}\leaders\hrule height\headrulewidth\hfill}}
\renewcommand{\footrulewidth}{0pt}
\fancypagestyle{reinfirst}{\fancyhf{}
  \fancyfoot[L]{\sffamily\fontsize{7}{9}\selectfont\color{REINMuted}\rein@footerleft}
  \fancyfoot[R]{\sffamily\small\color{REINForest}\thepage}
  \renewcommand{\headrulewidth}{0pt}}
\fancypagestyle{plain}{\fancyhf{}
  \fancyfoot[L]{\sffamily\fontsize{7}{9}\selectfont\color{REINMuted}\rein@footerleft}
  \fancyfoot[R]{\sffamily\small\color{REINForest}\thepage}
  \renewcommand{\headrulewidth}{0pt}}

\newcommand{\rein@titleblock}{%
  \begingroup\setlength{\parindent}{0pt}
  \ifreinanonymous
    {\sffamily\small\color{REINMuted}ANONYMOUS RESEARCH MANUSCRIPT
      \ifdefempty{\rein@paperid}{}{\hfill PAPER \rein@paperid}\par}
  \else
    \rein@brandrow\vspace{4pt}
    {\sffamily\fontsize{6.5}{8}\selectfont\color{REINMuted}%
      \MakeUppercase{\reinlabname}\hfill\rein@status
      \ifdefempty{\rein@version}{}{\ / \rein@version}\par}
  \fi
  \vspace{6pt}
  {\color{REINForest}\hrule height 1.1pt}\vspace{2pt}
  {\color{REINGold}\hrule width 36pt height 2pt}\vspace{10pt}
  {\raggedright\bfseries\color{REINInk}%
    \ifreintwocolumn\fontsize{23}{26}\else\fontsize{25}{29}\fi
    \selectfont\@title\par}
  \vspace{8pt}
  \ifreinanonymous
    {\sffamily\normalsize Anonymous authors\par}
    \vspace{3pt}{\small Author information withheld for review\par}
  \else
    {\sffamily\bfseries\normalsize\@author\par}
    \vspace{4pt}{\small\rein@affiliation\par}
    \ifdefempty{\rein@emails}{}{%
      \vspace{2pt}{\ttfamily\footnotesize\rein@emails\par}
    }
  \fi
  \vspace{10pt}
  \endgroup}
\renewcommand{\maketitle}{%
  \ifreinanonymous
    \hypersetup{pdftitle={\@title},pdfauthor={Anonymous authors},
      pdfsubject={},pdfkeywords={}}
  \else
    \hypersetup{pdftitle={\@title},pdfauthor={\@author},
      pdfsubject={\reinlabname; \rein@track},pdfkeywords={\rein@keywords}}
  \fi
  \ifreintwocolumn\twocolumn[\rein@titleblock]\else\rein@titleblock\fi
  \thispagestyle{reinfirst}}
\renewenvironment{abstract}{%
  \par\begingroup\setlength{\parindent}{0pt}
  {\sffamily\bfseries\small\color{REINForest}ABSTRACT\par}\vspace{4pt}
  \small\ignorespaces
}{%
  \par\reinresources\ifdefempty{\rein@keywords}{}{%
    \vspace{6pt}{\sffamily\fontsize{8}{10}\selectfont
      \textbf{Keywords}\quad\rein@keywords\par}
  }\endgroup\vspace{8pt}}
\newcommand{\reinbibliography}[1]{\bibliographystyle{unsrtnat}\bibliography{#1}}
\setlength{\bibsep}{4pt}
\renewcommand{\bibfont}{\small}
\endinput

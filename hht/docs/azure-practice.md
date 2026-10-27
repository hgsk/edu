# 講師の Azure Ubuntu VM で公開演習

講師が用意した**既存の Ubuntu VM**を、受講者の SSH・SCP・SFTP と Apache の静的HTML配信に使います。  
対象は講師が示した Azure サブスクリプション `977b2beb-7e72-4aef-b116-2d7a21e252b7` 内のVMです。  
このリポジトリの [Configure Azure practice VM](https://github.com/hgsk/edu/actions/workflows/azure-practice.yml) はVMを作成しません。  
まず講師が対象VMのOS、接続先、管理権限、公開IP、料金を確認してください。  
受講者ごとに `hht-受講者ID` アカウントと `/srv/hht-public/受講者ID/` を分けます。

## 料金と接続の前提

Teams アカウントは Azure へのサインインに使えますが、VMの無料枠はTeamsの契約だけでは付きません。  
既存サブスクリプションの[無料対象](https://azure.microsoft.com/en-us/pricing/free-services/)・残クレジットを講師が確認します。  
[公開IP](https://azure.microsoft.com/en-us/pricing/details/ip-addresses/)、VM、ディスク、通信は個別に課金され得ます。  
無料になることは保証できません。  
このワークフロー自体はAzureリソースを新規作成しません。

Azure VMに公開IPがあり、ネットワークセキュリティグループ（NSG）とUbuntu側のファイアウォールで TCP 22（SSH/SCP/SFTP）と TCP 80（HTTP）を許可します。  
可能なら22番の接続元を授業用ネットワークに絞ります。  
講師がVMへ直接接続し、下記スクリプトを実行します。  
GitHub Actionsは使いません。  
公開URLは学習用の静的ページだけに使い、個人情報や認証情報を置きません。

## 講師の初期設定

既存サイトとApache設定に影響するため、講師はVMの現在の80番ポート、Apacheサイト、SSH設定とバックアップを確認します。  
スクリプトは既存のデフォルトサイトを消さず、`/students/` の配信設定を追加します。  
ApacheとOpenSSH ServerがなければUbuntuのaptで導入します。

講師がVMへ直接接続し、事前に安全に転送したスクリプトを実行します。  
管理者の秘密鍵や認証情報は、リポジトリへ保存しません。

```bash
sudo bash hht/scripts/setup-azure-practice.sh setup
```

直接実行する場合は、先にこのリポジトリをVMへコピーするか、スクリプトファイルだけを安全に転送してください。  
スクリプトは `/etc/ssh/sshd_config` の元ファイルを日時付きで保存し、受講者向け公開鍵認証の設定を末尾へ追加します。  
受講者には `sudo` 権限を与えません。

## 受講者を追加

受講者は自分のPCで授業用の鍵を作り、`.pub` の**公開鍵だけ**を講師へ渡します。

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/hht_practice -N ''
cat ~/.ssh/hht_practice.pub
```

講師は受講者IDと公開鍵を照合し、VMで次を実行します。

```bash
sudo bash hht/scripts/setup-azure-practice.sh add-student alice /path/to/alice.pub
```

同じIDで再実行すると、講師管理の公開鍵ファイルを入力した鍵で更新します。  
受講者の制作ファイルは残します。  
接続先とURLは受講者ごとに講師が伝えます。  
各受講者のログインセッションにはCPU 50%、メモリ256MB、タスク32個、1ファイル50MBの上限を設定します。  
ディスク全体の割当制限にはならないため、講師は `df -h` と `du -sh /srv/hht-public/* /home/hht-*` で使用量を監視し、VMのディスクを安易に拡張しません。

## PCのターミナルから接続・配信確認

`VM_HOST` と `alice` を自分の接続票に合わせて置き換えます。  
初回は講師が示したホスト鍵フィンガープリントを照合します。  
Apacheは `/srv/hht-public/alice/` のファイルを `http://VM_HOST/students/alice/` で配信します。

```bash
ssh -i ~/.ssh/hht_practice hht-alice@VM_HOST
scp -i ~/.ssh/hht_practice hht/starter-site/index.html hht-alice@VM_HOST:/srv/hht-public/alice/
sftp -i ~/.ssh/hht_practice hht-alice@VM_HOST
```

SFTPでは `/srv/hht-public/alice/` に移動して `put` します。  
Apacheから新しいファイルが読めない場合は、自分の公開フォルダー内で `chmod g+r ファイル名` を実行します。  
講師は `apache2ctl configtest`、`systemctl is-active apache2 ssh`、接続元からの SFTP 転送、公開URLの表示を実際に確認します。

Apacheは `/students/` の一覧表示とドットで始まる隠しファイルの配信を禁止します。  
受講者は自分のフォルダーだけを更新し、他の受講者や講師の領域を変更しません。  
実運用の本番サイトには、このHTTP演習設定をそのまま使いません。
